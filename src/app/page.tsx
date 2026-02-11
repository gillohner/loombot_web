"use client";

import Link from "next/link";
import { useAuth } from "@/components/providers/auth-provider";
import { AppLayout } from "@/components/layout/app-layout";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Bot, Settings, Database, Plus, ArrowRight } from "lucide-react";
import { useBotConfigs } from "@/hooks/use-bot-configs";
import { useServiceConfigs } from "@/hooks/use-service-configs";
import { useDatasets } from "@/hooks/use-datasets";
import { redirect } from "next/navigation";

export default function DashboardPage() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    redirect("/login");
  }

  return (
    <AppLayout>
      <Header title="Dashboard" />
      <div className="p-6 space-y-6">
        <WelcomeSection />
        <StatsSection />
        <QuickActions />
      </div>
    </AppLayout>
  );
}

function WelcomeSection() {
  const { auth } = useAuth();
  const truncatedKey = auth.publicKey
    ? `${auth.publicKey.slice(0, 12)}...${auth.publicKey.slice(-8)}`
    : "";

  return (
    <div className="space-y-2">
      <h1 className="text-3xl font-bold">Welcome back!</h1>
      <p className="text-muted-foreground">
        Signed in as <span className="font-mono text-sm">{truncatedKey}</span>
      </p>
    </div>
  );
}

function StatsSection() {
  const { configs, isLoading: loadingConfigs } = useBotConfigs();
  const { configs: serviceConfigs, isLoading: loadingServices } =
    useServiceConfigs();
  const { datasets, isLoading: loadingDatasets } = useDatasets();

  const stats = [
    {
      title: "Bot Configs",
      value: loadingConfigs ? "..." : configs.length,
      icon: Bot,
      href: "/configs",
      color: "text-blue-500",
    },
    {
      title: "Service Configs",
      value: loadingServices ? "..." : serviceConfigs.length,
      icon: Settings,
      href: "/service-configs",
      color: "text-purple-500",
    },
    {
      title: "Datasets",
      value: loadingDatasets ? "..." : datasets.length,
      icon: Database,
      href: "/datasets",
      color: "text-green-500",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {stats.map((stat) => (
        <Link key={stat.title} href={stat.href}>
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}

function QuickActions() {
  const actions = [
    {
      title: "Create Bot Config",
      description: "Set up a new Telegram bot configuration",
      icon: Bot,
      href: "/configs/new",
    },
    {
      title: "Create Service Config",
      description: "Configure a reusable service from a Git URL",
      icon: Settings,
      href: "/service-configs/new",
    },
    {
      title: "Create Dataset",
      description: "Create a new dataset for your services",
      icon: Database,
      href: "/datasets/new",
    },
  ];

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Quick Actions</h2>
      <div className="grid gap-4 md:grid-cols-3">
        {actions.map((action) => (
          <Card key={action.title} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <action.icon className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-lg">{action.title}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <CardDescription>{action.description}</CardDescription>
              <Button asChild variant="outline" className="w-full">
                <Link href={action.href}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create
                  <ArrowRight className="h-4 w-4 ml-auto" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
