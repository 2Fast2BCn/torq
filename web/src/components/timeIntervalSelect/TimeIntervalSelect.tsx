import "./interval_select.scss";
import { useState } from "react";
import { format, startOfDay } from "date-fns";
import locale from 'date-fns/locale/en-US'
import {
  defaultStaticRanges, defineds,
} from "./customRanges";

import { DateRangePicker } from "react-date-range";
import Popover from "../popover/Popover";
import { addDays } from "date-fns";
import { useAppSelector, useAppDispatch } from "../../store/hooks";
import { selectTimeInterval, updateInterval } from "./timeIntervalSlice";
import classNames from "classnames";

interface selection {
  startDate: Date,
  endDate: Date,
  key: string,
}

function TimeIntervalSelect() {
  const currentPeriod = useAppSelector(selectTimeInterval);
  const [isMobile, setIsMobile] = useState(false)
  const [isCustom, setIsCustom] = useState(false)

  const selection1: selection = {
    startDate: new Date(currentPeriod.from),
    endDate: new Date(currentPeriod.to),
    key: "selection1",
  }

  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const dispatch = useAppDispatch()

  const handleChange = (item: any) => {
    const interval = {
      from: item.selection1.startDate.toString(),
      to: item.selection1.endDate.toString()
    }
    dispatch(updateInterval(interval))
  };

  const handleMobileClick = (e: boolean) => {
    setIsMobile(e)
    setIsCustom(e)
  }

  const renderCustomRangeLabel = () => (
    //@ts-ignore
    <div onClick={() => handleMobileClick(true)} className="custom-mobile">
      Custom
    </div>
  );

  const dateRangeClass = classNames("date-range-popover", {
    "mobile-date-range": isMobile
  });

  const button = <div
    className="time-interval-wrapper"
    onClick={() => setIsPopoverOpen(!isPopoverOpen)}
  >
    <div className="icon">{/* <IntervalIcon /> */}</div>
    <div className="interval">
      <div className="">
        <p className="text-base">
          {" "}
          {format(new Date(currentPeriod.from), "MMM d, yyyy")} -{" "}
          {format(new Date(currentPeriod.to), "MMM d, yyyy")}
        </p>
        {/*<p className="text-slate-400 text-sm">*/}
        {/*  {" "}*/}
        {/*  {format(new Date(currentPeriod.compareFrom), "MMM d, yyyy")} -{" "}*/}
        {/*  {format(new Date(currentPeriod.compareTo), "MMM d, yyyy")}*/}
        {/*</p>*/}
      </div>
    </div>
  </div>

  return (
    <div className={dateRangeClass}>
      <Popover button={button}>
        <div className="date-range-popover-content">
          <button className="close-date-range-mobile" onClick={() => handleMobileClick(false)}>X</button>

          <DateRangePicker
            renderStaticRangeLabel={renderCustomRangeLabel}
            monthDisplayFormat="MMMM yyyy"
            showDateDisplay={false}
            staticRanges={[...defaultStaticRanges, {
              label: 'Custom',
              hasCustomRendering: true,
              range: () => ({
                startDate: startOfDay(addDays(new Date(), -3)),
                endDate: new Date()
              }),
              isSelected() {
                return isMobile
              }
            }]}
            fixedHeight={false}
            rangeColors={["#ECFAF8", "#F9FAFB"]}
            maxDate={addDays(new Date(), 0)}
            minDate={addDays((new Date().setFullYear(2015, 1, 1)), 0)}
            scroll={{ enabled: true, calendarHeight: 400 }}
            months={1}
            showMonthArrow={false}
            showMonthAndYearPickers={false}
            weekStartsOn={locale.options?.weekStartsOn || 0}
            direction="vertical"
            inputRanges={[]}
            ranges={[selection1]}
            onChange={(item) => {
              handleChange(item)
            }}
          />

        </div>
      </Popover>
    </div>
  );
}
export default TimeIntervalSelect;
