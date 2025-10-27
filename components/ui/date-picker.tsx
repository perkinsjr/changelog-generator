"use client";

import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface DatePickerProps {
  value?: string;
  onChange?: (date: string) => void;
  placeholder?: string;
  disabled?: boolean;
  minDate?: Date;
  maxDate?: Date;
  className?: string;
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Pick a date",
  disabled = false,
  minDate,
  maxDate,
  className,
}: DatePickerProps) {
  const [date, setDate] = React.useState<Date | undefined>(
    value ? new Date(value + "T00:00:00") : undefined,
  );

  // Sync internal state with prop changes
  React.useEffect(() => {
    const newDate = value ? new Date(value + "T00:00:00") : undefined;
    setDate(newDate);
  }, [value]);

  const handleDateChange = (selectedDate: Date | undefined) => {
    setDate(selectedDate);
    if (selectedDate && !isNaN(selectedDate.getTime())) {
      // Ensure we get the date in local timezone as YYYY-MM-DD
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, "0");
      const day = String(selectedDate.getDate()).padStart(2, "0");
      const dateString = `${year}-${month}-${day}`;
      console.log("DatePicker: Setting date", dateString);
      onChange?.(dateString);
    } else {
      onChange?.("");
    }
  };

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal h-10 border-input hover:bg-muted hover:text-foreground focus-visible:ring-foreground/20 focus-visible:ring-2 focus-visible:ring-offset-0",
              !date && "text-muted-foreground",
            )}
            disabled={disabled}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date && !isNaN(date.getTime()) ? format(date, "PPP") : placeholder}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={date}
            onSelect={handleDateChange}
            disabled={(date) => {
              // Use local date comparison to avoid timezone issues
              const today = new Date();
              today.setHours(23, 59, 59, 999); // End of today

              if (minDate && date < minDate) return true;
              if (maxDate && date > maxDate) return true;
              return date > today || date < new Date("1900-01-01");
            }}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
