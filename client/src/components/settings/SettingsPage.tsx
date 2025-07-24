import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Settings, DollarSign, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AdminDashboard from '../admin/AdminDashboard';
import TaxConfiguration from './TaxConfiguration';

interface SettingsPageProps {
  onBack: () => void;
}

const SettingsPage: React.FC<SettingsPageProps> = ({ onBack }) => {
  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-4">
          <Button
            onClick={onBack}
            variant="ghost"
            size="sm"
            className="text-gray-400 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <div className="flex items-center gap-3">
            <Settings className="h-8 w-8 text-purple-400" />
            <h1 className="text-3xl font-bold text-white">Settings</h1>
          </div>
        </div>
      </div>

      <Tabs defaultValue="tax" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-8">
          <TabsTrigger value="tax" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Tax Configuration
          </TabsTrigger>
          <TabsTrigger value="admin" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            API Usage Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tax">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Tax Configuration
              </CardTitle>
            </CardHeader>
            <CardContent>
              <TaxConfiguration />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="admin">
          <AdminDashboard onBack={onBack} hideBackButton={true} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SettingsPage;