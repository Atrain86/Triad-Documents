import React from "react";
import { useForm, Controller } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ProjectForm() {
  const form = useForm({ defaultValues: { clientName: "", address: "", roomCount: 1, difficulty: "medium" } });

  const onSubmit = async (data: any) => {
    await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  };

  return (
    <Card className="bg-gray-900 text-white border-gray-700">
      <CardHeader>
        <CardTitle>Create New Project</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <Controller
            name="clientName"
            control={form.control}
            render={({ field }) => <Input {...field} placeholder="Client Name" className="bg-gray-800 text-white border-gray-600" />}
          />
          <Controller
            name="address"
            control={form.control}
            render={({ field }) => <Input {...field} placeholder="Address" className="bg-gray-800 text-white border-gray-600" />}
          />
          <Controller
            name="projectType"
            control={form.control}
            render={({ field }) => <Input {...field} placeholder="Project Type" className="bg-gray-800 text-white border-gray-600" />}
          />
          <Controller
            name="roomCount"
            control={form.control}
            render={({ field }) => (
              <Input type="number" {...field} placeholder="Room Count" className="bg-gray-800 text-white border-gray-600" />
            )}
          />
          <Controller
            name="difficulty"
            control={form.control}
            render={({ field }) => <Input {...field} placeholder="Difficulty" className="bg-gray-800 text-white border-gray-600" />}
          />
          <Controller
            name="status"
            control={form.control}
            render={({ field }) => <Input {...field} placeholder="Status" className="bg-gray-800 text-white border-gray-600" />}
          />
          <Controller
            name="notes"
            control={form.control}
            render={({ field }) => <Textarea {...field} placeholder="Notes" className="bg-gray-800 text-white border-gray-600" />}
          />
          <Button type="submit" className="bg-green-600 hover:bg-green-700 w-full">
            Save Project
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}