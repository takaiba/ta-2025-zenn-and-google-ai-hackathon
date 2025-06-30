import sys

from django.core.management.base import BaseCommand

sys.path.append("/app")

from batch_concatenate_minutes import main


class Command(BaseCommand):
    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS("Starting batch process..."))
        main()
        self.stdout.write(self.style.SUCCESS("Batch process completed successfully."))
