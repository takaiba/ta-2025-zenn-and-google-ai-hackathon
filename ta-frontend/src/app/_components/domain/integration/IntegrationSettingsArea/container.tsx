"use client";

import { useState } from "react";

import { api } from "@/trpc/react";

import { IntegrationSettingsAreaPresentation } from "./presentation";

export const IntegrationSettingsArea = () => {
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  
  const { data: projects, isLoading: projectsLoading } = api.project.getAll.useQuery();
  const { data: integrations, isLoading: integrationsLoading } = api.integration.getAll.useQuery({
    projectId: selectedProjectId || undefined,
  });

  const isLoading = projectsLoading || integrationsLoading;

  return (
    <IntegrationSettingsAreaPresentation
      projects={projects || []}
      integrations={integrations}
      isLoading={isLoading}
      selectedProjectId={selectedProjectId}
      onProjectChange={setSelectedProjectId}
    />
  );
};