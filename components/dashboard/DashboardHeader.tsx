// components/dashboard/DashboardHeader.tsx
"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "../../components/ui/button";
import CreatePoolModal from "../../components/pools/CreatePoolModal";
import { SearchInput } from "../../components/search/SearchInput";

interface DashboardHeaderProps {
  title: string;
  subtitle?: string;
}

const DashboardHeader = ({ title, subtitle }: DashboardHeaderProps) => {
  const [isCreatePoolModalOpen, setIsCreatePoolModalOpen] = useState(false);

  const handleCreatePool = (poolData: any) => {
    // In a real app, this would call an API to create a pool
    console.log("Creating pool with data:", poolData);
    // You would then refresh the pools list or navigate to the new pool
  };

  return (
    <>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between py-6 px-4 sm:px-0">
        <div>
          <h2 className="text-3xl font-semibold text-gray-800">{title}</h2>
          {subtitle && <p className="mt-2 text-gray-500 text-lg">{subtitle}</p>}
        </div>

        <div className="mt-6 md:mt-0 flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4">
          <SearchInput />

          <Button
            onClick={() => setIsCreatePoolModalOpen(true)}
            className="flex items-center justify-center"
            size="lg"
          >
            <Plus className="h-5 w-5 mr-2" />
            Create Pool
          </Button>
        </div>
      </div>

      <CreatePoolModal
        isOpen={isCreatePoolModalOpen}
        onClose={() => setIsCreatePoolModalOpen(false)}
        onCreatePool={handleCreatePool}
      />
    </>
  );
};

export default DashboardHeader;
