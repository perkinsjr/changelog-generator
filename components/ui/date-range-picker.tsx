"use client";

import { CalendarIcon } from "lucide-react";
import * as React from "react";
import type { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface DateRangePickerProps {
  className?: string;
  onDateChange?: (dateRange: { startDate: string; endDate: string } | null) => void;
  disabled?: boolean;
}

export function DateRangePicker({
  className,
  onDateChange,
  disabled = false,
}: DateRangePickerProps) {
  const [date, setDate] = React.useState<DateRange | undefined>();

  const handleDateChange = (newDate: DateRange | undefined) => {
    setDate(newDate);

    if (newDate?.from && newDate?.to) {
      // Ensure end date is not before start date
      if (newDate.to < newDate.from) {
        // Swap dates if end is before start
        const temp = newDate.from;
        newDate.from = newDate.to;
        newDate.to = temp;
        setDate({ from: newDate.from, to: newDate.to });
      }

      // Both dates are selected and valid
      onDateChange?.({
        startDate: newDate.from.toISOString().split("T")[0],
        endDate: newDate.to.toISOString().split("T")[0],
      });
    } else {
      // Either no dates selected or only one date selected
      onDateChange?.(null);
    }
  };

  const formatDateRange = () => {
    if (!date?.from) {
      return "Select start date";
    }

    if (!date.to) {
      return `${date.from.toLocaleDateString()} - Select end date`;
    }

    return `${date.from.toLocaleDateString()} - ${date.to.toLocaleDateString()}`;
  };

  const isDateRangeComplete = date?.from && date?.to;

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal h-10",
              !date?.from && "text-muted-foreground",
              isDateRangeComplete && "border-primary",
            )}
            disabled={disabled}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {formatDateRange()}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={date?.from || new Date()}
            selected={date}
            onSelect={handleDateChange}
            numberOfMonths={2}
            disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
            className="rounded-md"
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
