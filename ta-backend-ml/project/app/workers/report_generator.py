import json
import logging
import base64
from typing import Dict, List, Optional
from datetime import datetime
from io import BytesIO
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, A4
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from prisma import Prisma
import matplotlib.pyplot as plt
import matplotlib
matplotlib.use('Agg')  # Use non-interactive backend

logger = logging.getLogger(__name__)


class ReportGenerator:
    """Generate test reports in various formats"""
    
    def __init__(self, prisma: Prisma):
        self.prisma = prisma
        self.styles = getSampleStyleSheet()
        self._setup_custom_styles()
    
    def _setup_custom_styles(self):
        """Setup custom paragraph styles"""
        self.styles.add(ParagraphStyle(
            name='CustomTitle',
            parent=self.styles['Heading1'],
            fontSize=24,
            textColor=colors.HexColor('#1a1a1a'),
            spaceAfter=30,
        ))
        
        self.styles.add(ParagraphStyle(
            name='SectionHeader',
            parent=self.styles['Heading2'],
            fontSize=16,
            textColor=colors.HexColor('#333333'),
            spaceAfter=12,
        ))
    
    def generate(self, test_session_id: str, format_type: str = "pdf") -> Dict:
        """
        Generate test report in specified format
        
        Args:
            test_session_id: Test session ID
            format_type: Report format (pdf, html, json)
            
        Returns:
            Generated report information
        """
        logger.info(f"Generating {format_type} report for session {test_session_id}")
        
        # Get test session data
        test_session = self.prisma.testsession.find_unique(
            where={"id": test_session_id},
            include={
                "project": True,
                "account": True,
                "testConfig": True,
                "bugTickets": True,
                "testResults": True
            }
        )
        
        if not test_session:
            raise ValueError(f"Test session {test_session_id} not found")
        
        # Generate report based on format
        if format_type == "pdf":
            content = self._generate_pdf_report(test_session)
        elif format_type == "html":
            content = self._generate_html_report(test_session)
        elif format_type == "json":
            content = self._generate_json_report(test_session)
        else:
            raise ValueError(f"Unsupported format: {format_type}")
        
        return {
            "content": content,
            "format": format_type,
            "account_id": test_session.accountId,
            "generated_at": datetime.utcnow().isoformat()
        }
    
    def _generate_pdf_report(self, test_session) -> str:
        """Generate PDF report"""
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter)
        story = []
        
        # Title
        title = Paragraph(f"QA³ Test Report - {test_session.project.name}", self.styles['CustomTitle'])
        story.append(title)
        story.append(Spacer(1, 0.2 * inch))
        
        # Summary section
        story.append(Paragraph("Test Summary", self.styles['SectionHeader']))
        summary_data = [
            ["Project", test_session.project.name],
            ["Test Date", test_session.createdAt.strftime("%Y-%m-%d %H:%M:%S")],
            ["Duration", f"{test_session.duration or 0} seconds"],
            ["Status", test_session.status],
            ["Pages Scanned", str(test_session.pagesScanned)],
            ["Bugs Found", str(test_session.bugsFound)],
            ["Test Coverage", f"{test_session.testCoverage * 100:.1f}%"]
        ]
        
        summary_table = Table(summary_data, colWidths=[2*inch, 4*inch])
        summary_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 12),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
            ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#2c3e50')),
            ('BACKGROUND', (1, 0), (1, -1), colors.HexColor('#34495e')),
            ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#7f8c8d'))
        ]))
        story.append(summary_table)
        story.append(Spacer(1, 0.5 * inch))
        
        # Test Results section
        if test_session.testResults:
            story.append(Paragraph("Test Results", self.styles['SectionHeader']))
            
            results_data = [["Test Name", "Status", "Execution Time", "Error Message"]]
            for result in test_session.testResults:
                results_data.append([
                    result.testName[:50],
                    result.status,
                    f"{result.executionTime}ms",
                    (result.errorMessage or "")[:50]
                ])
            
            results_table = Table(results_data, colWidths=[2.5*inch, 1*inch, 1.5*inch, 2*inch])
            results_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#3498db')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 12),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
                ('GRID', (0, 0), (-1, -1), 1, colors.black)
            ]))
            story.append(results_table)
            story.append(Spacer(1, 0.5 * inch))
        
        # Bug Summary section
        if test_session.bugTickets:
            story.append(Paragraph("Bug Summary", self.styles['SectionHeader']))
            
            # Create bug severity chart
            severity_counts = {"critical": 0, "high": 0, "medium": 0, "low": 0}
            for bug in test_session.bugTickets:
                severity_counts[bug.severity] += 1
            
            # Generate chart
            fig, ax = plt.subplots(figsize=(6, 4))
            severities = list(severity_counts.keys())
            counts = list(severity_counts.values())
            colors_map = {
                "critical": "#e74c3c",
                "high": "#e67e22", 
                "medium": "#f39c12",
                "low": "#95a5a6"
            }
            bar_colors = [colors_map[s] for s in severities]
            
            ax.bar(severities, counts, color=bar_colors)
            ax.set_ylabel('Number of Bugs')
            ax.set_title('Bugs by Severity')
            
            # Save chart to buffer
            chart_buffer = BytesIO()
            plt.savefig(chart_buffer, format='png', bbox_inches='tight')
            chart_buffer.seek(0)
            plt.close()
            
            # Add chart to story
            chart_img = Image(chart_buffer, width=4*inch, height=2.5*inch)
            story.append(chart_img)
            story.append(Spacer(1, 0.3 * inch))
            
            # Bug details table
            bug_data = [["Title", "Severity", "Status", "Page URL"]]
            for bug in test_session.bugTickets[:10]:  # Limit to first 10 bugs
                bug_data.append([
                    bug.title[:40],
                    bug.severity,
                    bug.status,
                    bug.pageUrl[:30]
                ])
            
            bug_table = Table(bug_data, colWidths=[2.5*inch, 1*inch, 1*inch, 2.5*inch])
            bug_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#e74c3c')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 12),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
                ('GRID', (0, 0), (-1, -1), 1, colors.black)
            ]))
            story.append(bug_table)
        
        # Build PDF
        doc.build(story)
        
        # Return base64 encoded PDF
        pdf_data = buffer.getvalue()
        buffer.close()
        return base64.b64encode(pdf_data).decode('utf-8')
    
    def _generate_html_report(self, test_session) -> str:
        """Generate HTML report"""
        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <title>QA³ Test Report - {test_session.project.name}</title>
            <style>
                body {{ font-family: Arial, sans-serif; margin: 40px; }}
                h1 {{ color: #1a1a1a; }}
                h2 {{ color: #333333; margin-top: 30px; }}
                table {{ border-collapse: collapse; width: 100%; margin: 20px 0; }}
                th, td {{ border: 1px solid #ddd; padding: 12px; text-align: left; }}
                th {{ background-color: #3498db; color: white; }}
                tr:nth-child(even) {{ background-color: #f2f2f2; }}
                .summary {{ background-color: #ecf0f1; padding: 20px; border-radius: 5px; }}
                .critical {{ color: #e74c3c; font-weight: bold; }}
                .high {{ color: #e67e22; font-weight: bold; }}
                .medium {{ color: #f39c12; }}
                .low {{ color: #95a5a6; }}
            </style>
        </head>
        <body>
            <h1>QA³ Test Report - {test_session.project.name}</h1>
            
            <div class="summary">
                <h2>Test Summary</h2>
                <p><strong>Test Date:</strong> {test_session.createdAt.strftime("%Y-%m-%d %H:%M:%S")}</p>
                <p><strong>Duration:</strong> {test_session.duration or 0} seconds</p>
                <p><strong>Status:</strong> {test_session.status}</p>
                <p><strong>Pages Scanned:</strong> {test_session.pagesScanned}</p>
                <p><strong>Bugs Found:</strong> {test_session.bugsFound}</p>
                <p><strong>Test Coverage:</strong> {test_session.testCoverage * 100:.1f}%</p>
            </div>
        """
        
        # Add test results
        if test_session.testResults:
            html += """
            <h2>Test Results</h2>
            <table>
                <tr>
                    <th>Test Name</th>
                    <th>Status</th>
                    <th>Execution Time</th>
                    <th>Error Message</th>
                </tr>
            """
            for result in test_session.testResults:
                status_class = "passed" if result.status == "passed" else "failed"
                html += f"""
                <tr>
                    <td>{result.testName}</td>
                    <td class="{status_class}">{result.status}</td>
                    <td>{result.executionTime}ms</td>
                    <td>{result.errorMessage or ""}</td>
                </tr>
                """
            html += "</table>"
        
        # Add bug summary
        if test_session.bugTickets:
            html += """
            <h2>Bug Summary</h2>
            <table>
                <tr>
                    <th>Title</th>
                    <th>Severity</th>
                    <th>Status</th>
                    <th>Page URL</th>
                </tr>
            """
            for bug in test_session.bugTickets:
                html += f"""
                <tr>
                    <td>{bug.title}</td>
                    <td class="{bug.severity}">{bug.severity}</td>
                    <td>{bug.status}</td>
                    <td><a href="{bug.pageUrl}">{bug.pageUrl}</a></td>
                </tr>
                """
            html += "</table>"
        
        html += """
        </body>
        </html>
        """
        
        return base64.b64encode(html.encode('utf-8')).decode('utf-8')
    
    def _generate_json_report(self, test_session) -> str:
        """Generate JSON report"""
        report = {
            "project": {
                "id": test_session.project.id,
                "name": test_session.project.name,
                "url": test_session.project.url
            },
            "test_session": {
                "id": test_session.id,
                "status": test_session.status,
                "created_at": test_session.createdAt.isoformat(),
                "started_at": test_session.startedAt.isoformat() if test_session.startedAt else None,
                "completed_at": test_session.completedAt.isoformat() if test_session.completedAt else None,
                "duration": test_session.duration,
                "pages_scanned": test_session.pagesScanned,
                "bugs_found": test_session.bugsFound,
                "test_coverage": test_session.testCoverage
            },
            "test_config": {
                "mode": test_session.testConfig.mode,
                "browser": test_session.testConfig.browser,
                "viewport": {
                    "width": test_session.testConfig.viewportWidth,
                    "height": test_session.testConfig.viewportHeight
                }
            },
            "test_results": [
                {
                    "id": result.id,
                    "test_name": result.testName,
                    "status": result.status,
                    "execution_time": result.executionTime,
                    "error_message": result.errorMessage
                }
                for result in test_session.testResults
            ],
            "bugs": [
                {
                    "id": bug.id,
                    "title": bug.title,
                    "description": bug.description,
                    "severity": bug.severity,
                    "status": bug.status,
                    "page_url": bug.pageUrl,
                    "reproduction_steps": json.loads(bug.reproductionSteps) if bug.reproductionSteps else [],
                    "expected_behavior": bug.expectedBehavior,
                    "actual_behavior": bug.actualBehavior
                }
                for bug in test_session.bugTickets
            ]
        }
        
        return json.dumps(report, indent=2)