import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSubscriptionPlans, useAdminUsers } from "@/hooks/useAdminData";
import { TrendingUp, Users, Euro, Calculator, BarChart3 } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";

interface PlanDistribution {
  planId: string;
  planName: string;
  percentage: number;
  price: number;
}

const SCENARIOS = {
  conservative: { conversionRate: 5, monthlyGrowth: 2, label: "Conservativo" },
  realistic: { conversionRate: 15, monthlyGrowth: 5, label: "Realistico" },
  optimistic: { conversionRate: 25, monthlyGrowth: 10, label: "Ottimistico" },
};

export function RevenueSimulator() {
  const { data: plans = [] } = useSubscriptionPlans();
  const { data: users = [] } = useAdminUsers();

  const activePlans = plans.filter((p) => p.is_active && p.price > 0);
  const currentUserCount = users.length;

  const [totalUsers, setTotalUsers] = useState(currentUserCount || 100);
  const [conversionRate, setConversionRate] = useState(15);
  const [scenario, setScenario] = useState<keyof typeof SCENARIOS>("realistic");
  const [planDistributions, setPlanDistributions] = useState<PlanDistribution[]>([]);

  // Initialize plan distributions when plans load
  useMemo(() => {
    if (activePlans.length > 0 && planDistributions.length === 0) {
      const equalShare = Math.floor(100 / activePlans.length);
      const distributions = activePlans.map((plan, index) => ({
        planId: plan.id,
        planName: plan.name,
        percentage: index === 0 ? 100 - equalShare * (activePlans.length - 1) : equalShare,
        price: Number(plan.price),
      }));
      setPlanDistributions(distributions);
    }
  }, [activePlans, planDistributions.length]);

  const updateDistribution = (planId: string, newPercentage: number) => {
    setPlanDistributions((prev) => {
      const updated = prev.map((p) =>
        p.planId === planId ? { ...p, percentage: newPercentage } : p
      );
      return updated;
    });
  };

  const payingUsers = Math.round((totalUsers * conversionRate) / 100);

  const monthlyRevenue = useMemo(() => {
    return planDistributions.reduce((total, plan) => {
      const usersOnPlan = Math.round((payingUsers * plan.percentage) / 100);
      return total + usersOnPlan * plan.price;
    }, 0);
  }, [planDistributions, payingUsers]);

  const annualRevenue = monthlyRevenue * 12;
  const arpu = payingUsers > 0 ? monthlyRevenue / payingUsers : 0;

  // Generate 12-month projection data
  const projectionData = useMemo(() => {
    const monthlyGrowth = SCENARIOS[scenario].monthlyGrowth / 100;
    const months = [];
    let currentUsers = totalUsers;
    let currentPaying = payingUsers;

    for (let i = 0; i < 12; i++) {
      const monthRevenue = planDistributions.reduce((total, plan) => {
        const usersOnPlan = Math.round((currentPaying * plan.percentage) / 100);
        return total + usersOnPlan * plan.price;
      }, 0);

      months.push({
        month: new Date(2025, i).toLocaleDateString("it-IT", { month: "short" }),
        revenue: Math.round(monthRevenue),
        users: Math.round(currentUsers),
        paying: Math.round(currentPaying),
      });

      currentUsers = currentUsers * (1 + monthlyGrowth);
      currentPaying = Math.round((currentUsers * conversionRate) / 100);
    }

    return months;
  }, [totalUsers, payingUsers, conversionRate, planDistributions, scenario]);

  // Breakdown by plan for bar chart
  const planBreakdown = useMemo(() => {
    return planDistributions.map((plan) => {
      const usersOnPlan = Math.round((payingUsers * plan.percentage) / 100);
      return {
        name: plan.planName,
        users: usersOnPlan,
        revenue: usersOnPlan * plan.price,
      };
    });
  }, [planDistributions, payingUsers]);

  const handleScenarioChange = (newScenario: keyof typeof SCENARIOS) => {
    setScenario(newScenario);
    setConversionRate(SCENARIOS[newScenario].conversionRate);
  };

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-card to-primary/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <Calculator className="h-5 w-5 text-primary" />
          Simulatore Revenue
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Scenario Selector */}
        <div className="flex gap-2">
          {Object.entries(SCENARIOS).map(([key, value]) => (
            <button
              key={key}
              onClick={() => handleScenarioChange(key as keyof typeof SCENARIOS)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                scenario === key
                  ? "bg-primary text-primary-foreground shadow-lg"
                  : "bg-muted hover:bg-muted/80 text-muted-foreground"
              }`}
            >
              {value.label}
            </button>
          ))}
        </div>

        {/* Parameters */}
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Utenti Totali
                </span>
                <span className="font-bold text-primary">{totalUsers.toLocaleString()}</span>
              </Label>
              <Slider
                value={[totalUsers]}
                onValueChange={([value]) => setTotalUsers(value)}
                min={10}
                max={10000}
                step={10}
                className="py-2"
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Tasso Conversione
                </span>
                <span className="font-bold text-primary">{conversionRate}%</span>
              </Label>
              <Slider
                value={[conversionRate]}
                onValueChange={([value]) => setConversionRate(value)}
                min={1}
                max={50}
                step={1}
                className="py-2"
              />
            </div>
          </div>

          {/* Plan Distribution */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Distribuzione Piani
            </Label>
            {planDistributions.map((plan) => (
              <div key={plan.planId} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>{plan.planName}</span>
                  <span className="text-muted-foreground">
                    {plan.percentage}% • €{plan.price}/mese
                  </span>
                </div>
                <Slider
                  value={[plan.percentage]}
                  onValueChange={([value]) => updateDistribution(plan.planId, value)}
                  min={0}
                  max={100}
                  step={5}
                  className="py-1"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Results Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="bg-primary/10 border-primary/20">
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-primary">
                €{monthlyRevenue.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">Revenue Mensile</p>
            </CardContent>
          </Card>
          <Card className="bg-green-500/10 border-green-500/20">
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-green-600">
                €{annualRevenue.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">Revenue Annuale</p>
            </CardContent>
          </Card>
          <Card className="bg-blue-500/10 border-blue-500/20">
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-blue-600">
                {payingUsers.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">Utenti Paganti</p>
            </CardContent>
          </Card>
          <Card className="bg-purple-500/10 border-purple-500/20">
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-purple-600">
                €{arpu.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">ARPU</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <Tabs defaultValue="projection" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="projection">Proiezione 12 Mesi</TabsTrigger>
            <TabsTrigger value="breakdown">Breakdown Piani</TabsTrigger>
          </TabsList>
          <TabsContent value="projection" className="pt-4">
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={projectionData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                    formatter={(value: number, name: string) => [
                      name === "revenue" ? `€${value.toLocaleString()}` : value.toLocaleString(),
                      name === "revenue" ? "Revenue" : name === "users" ? "Utenti" : "Paganti",
                    ]}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ fill: "hsl(var(--primary))" }}
                    name="Revenue (€)"
                  />
                  <Line
                    type="monotone"
                    dataKey="users"
                    stroke="hsl(142, 76%, 36%)"
                    strokeWidth={2}
                    dot={{ fill: "hsl(142, 76%, 36%)" }}
                    name="Utenti Totali"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>
          <TabsContent value="breakdown" className="pt-4">
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={planBreakdown}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                    formatter={(value: number, name: string) => [
                      name === "revenue" ? `€${value.toLocaleString()}` : value.toLocaleString(),
                      name === "revenue" ? "Revenue" : "Utenti",
                    ]}
                  />
                  <Legend />
                  <Bar dataKey="users" fill="hsl(var(--primary))" name="Utenti" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="revenue" fill="hsl(142, 76%, 36%)" name="Revenue (€)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>
        </Tabs>

        {/* Info Footer */}
        <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
          <strong>Scenario {SCENARIOS[scenario].label}:</strong> Crescita mensile utenti del {SCENARIOS[scenario].monthlyGrowth}%, 
          tasso di conversione base del {SCENARIOS[scenario].conversionRate}%.
          Basato su {currentUserCount} utenti attuali.
        </div>
      </CardContent>
    </Card>
  );
}
