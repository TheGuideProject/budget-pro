import { BudgetGauge } from './BudgetGauge';
import { BudgetPieChart } from './BudgetPieChart';
import { BudgetBarChart } from './BudgetBarChart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BudgetMonthSummary, Expense } from '@/types';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface ImpactChartsCarouselProps {
  totalExpenses: number;
  totalIncome: number;
  expenses: Expense[];
  summaries: BudgetMonthSummary[];
}

export function ImpactChartsCarousel({
  totalExpenses,
  totalIncome,
  expenses,
  summaries,
}: ImpactChartsCarouselProps) {
  return (
    <>
      {/* Mobile: Carousel full-width */}
      <div className="md:hidden -mx-4">
        <Carousel
          opts={{
            align: 'start',
            loop: false,
          }}
          className="w-full"
        >
          <CarouselContent className="-ml-2">
            {/* Gauge */}
            <CarouselItem className="pl-2 basis-[90%]">
              <Card className="h-[360px]">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Utilizzo Budget</CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-center h-[300px]">
                  <BudgetGauge 
                    spent={totalExpenses} 
                    total={totalIncome}
                    size="lg"
                  />
                </CardContent>
              </Card>
            </CarouselItem>

            {/* Pie Chart */}
            <CarouselItem className="pl-2 basis-[90%]">
              <div className="h-[360px]">
                <BudgetPieChart expenses={expenses} />
              </div>
            </CarouselItem>

            {/* Bar Chart */}
            <CarouselItem className="pl-2 basis-[90%]">
              <div className="h-[360px]">
                <BudgetBarChart summaries={summaries} />
              </div>
            </CarouselItem>
          </CarouselContent>
          
          {/* Scroll indicator */}
          <div className="flex items-center justify-center gap-2 mt-3 px-4">
            <ChevronLeft className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Scorri per altri grafici</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
        </Carousel>
      </div>

      {/* Desktop: Grid 3 columns */}
      <div className="hidden md:grid md:grid-cols-3 gap-6">
        <Card className="h-full">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Utilizzo Budget</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center min-h-[280px]">
            <BudgetGauge 
              spent={totalExpenses} 
              total={totalIncome}
              size="lg"
            />
          </CardContent>
        </Card>
        <BudgetPieChart expenses={expenses} />
        <BudgetBarChart summaries={summaries} />
      </div>
    </>
  );
}
