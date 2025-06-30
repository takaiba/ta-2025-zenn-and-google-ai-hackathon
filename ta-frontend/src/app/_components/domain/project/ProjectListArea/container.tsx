"use client";

import { useState } from "react";

import { api } from "@/trpc/react";

import { Presentation } from "./presentation";

export const ProjectListArea = () => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  
  const { data: projects, isLoading, refetch } = api.project.getAll.useQuery();
  const { data: organization } = api.organization.getCurrent.useQuery();
  const { data: usageStats } = api.organization.getUsageStats.useQuery();

  const handleCreateProject = () => {
    setIsCreateModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsCreateModalOpen(false);
    refetch();
  };

  return (
    <Presentation
      projects={projects || []}
      organization={organization}
      usageStats={usageStats}
      isLoading={isLoading}
      isCreateModalOpen={isCreateModalOpen}
      onCreateProject={handleCreateProject}
      onCloseModal={handleCloseModal}
    />
  );
};