import React, { useState } from "react";
import styles from "./channel-page.module.scss";
import * as d3 from "d3";
import classNames from "classnames";
import Popover from "../popover/Popover";
import TimeIntervalSelect from "../timeIntervalSelect/TimeIntervalSelect";
import ProfitsChart from "./revenueChart/ProfitsChart";
import EventsChart from "./eventsChart/EventsChart";
import Switch from "../inputs/Slider/Switch";
import Button from "../buttons/Button";
import Select from "../inputs/Select";
import { Settings16Regular as SettingsIcon } from "@fluentui/react-icons";
import FlowChart from "./flowChart/FlowChart";

import { useGetFlowQuery, useGetChannelHistoryQuery } from "apiSlice";
import { useAppSelector, useAppDispatch } from "../../store/hooks";
import { selectTimeInterval } from "../timeIntervalSelect/timeIntervalSlice";
import { addDays, format } from "date-fns";
import { useParams } from "react-router";
import {
  selectEventChartKey,
  selectFlowKeys,
  selectProfitChartKey,
  updateEventChartKey,
  updateFlowKey,
  updateProfitChartKey,
} from "./channelSlice";
import eventIcons from "../charts/plots/eventIcons";

const ft = d3.format(",");

const f = d3.format(",.2s");
function fm(value: number): string | number {
  if (value > 1) {
    return f(value);
  }
  return value;
}

function formatEventText(type: string, value: number, prev: number, outbound: boolean): string {
  const changed = value > prev ? "increased" : "decreased";
  const changeText = `${changed} from ${fm(prev)} to ${fm(value)}`;
  switch (type) {
    case "fee_rate":
      return `Fee rate ${outbound ? "outbound" : "inbound"} ${changeText}`;
    case "base_fee":
      return `Base fee ${outbound ? "outbound" : "inbound"} ${changeText}`;
    case "min_htlc":
      return `Min HTLC ${outbound ? "outbound" : "inbound"} ${changeText}`;
    case "max_htlc":
      return `Max HTLC ${outbound ? "outbound" : "inbound"} ${changeText}`;
    case "rebalanced":
      return `Rebalanced ${f(value)} ${outbound ? "outbound" : "inbound"}`;
    case "disabled":
      return `Disabled channel ${outbound ? "outbound" : "inbound"}`;
    case "enabled":
      return `Enabled channel ${outbound ? "outbound" : "inbound"}`;
  }
  return "";
}

const eventNames = new Map([
  ["fee_rate", "Fee rate"],
  ["base_fee", "Base fee"],
  ["min_htlc", "Min htlc"],
  ["max_htlc", "Max htlc"],
  ["enabled", "Enabled"],
  ["disabled", "Disabled"],
]);

function ChannelPage() {
  const currentPeriod = useAppSelector(selectTimeInterval);
  const dispatch = useAppDispatch();
  const from = format(new Date(currentPeriod.from), "yyyy-MM-dd");
  const to = format(addDays(new Date(currentPeriod.to), 1), "yyyy-MM-dd");
  let [allToggle, setAllToggle] = React.useState(true);
  let [selectedEvents, setSelectedEvents] = React.useState(
    new Map<string, boolean>([
      ["fee_rate", true],
      ["base_fee", true],
      ["min_htlc", true],
      ["max_htlc", true],
      ["enabled", true],
      ["disabled", true],
    ])
  );
  const handleSelectEventUpdate = (type: string) => {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      setSelectedEvents(new Map(selectedEvents.set(type, e.target.checked)));
    };
  };

  let { chanId } = useParams();
  const { data, isLoading } = useGetFlowQuery({
    from: from,
    to: to,
    chanId: chanId || " ",
  });
  const historyQuery = useGetChannelHistoryQuery({
    from: from,
    to: to,
    chanIds: chanId || " ",
  });

  const flowKey = useAppSelector(selectFlowKeys);
  const profitKey = useAppSelector(selectProfitChartKey);
  const eventKey = useAppSelector(selectEventChartKey);
  let prev: string;
  let prevAlias: string;

  let total_capacity: number = 0;
  if (historyQuery?.data?.channels) {
    total_capacity = historyQuery.data.channels
      .map((d: { capacity: number }) => {
        return d.capacity;
      })
      .reduce((partialSum: number, a: number) => partialSum + a, 0);
  }

  return (
    <div className={styles.channelsPageContent}>
      <div className={styles.channelControls}>
        <div className={styles.leftContainer}>
          <div className={styles.upperContainer}>
            {!isLoading &&
              historyQuery.data &&
              (historyQuery.data.channels || [])
                .map((d: any, i: number) => {
                  return d.alias;
                })
                .filter((value: any, index: number, self: any[]) => {
                  return self.indexOf(value) === index;
                })
                .join(", ")}
          </div>
          <div className={styles.lowerContainer}></div>
        </div>
        <div className={styles.rightContainer}>
          <TimeIntervalSelect />
        </div>
      </div>

      <div className={styles.channelWrapper}>
        <div className={classNames(styles.pageRow, styles.channelSummary)}>
          <div className={styles.shortColumn}>
            <div className={styles.card}>
              <div className={styles.heading}>Revenue</div>
              <div className={styles.cardRow}>
                <div className={styles.rowLabel}>Forwarding fees</div>
                <div className={styles.rowValue}>{historyQuery?.data?.revenue_out}</div>
              </div>
              <div className={styles.cardRow}>
                <div className={styles.rowLabel}>Channel Leases</div>
                <div className={classNames(styles.rowValue, styles.comingSoon)}>(Coming soon)</div>
              </div>
              <div className={styles.cardRow}>
                <div className={styles.rowLabel}>Total</div>
                <div className={styles.rowValue}>{historyQuery?.data?.revenue_out}</div>
              </div>
            </div>
            <div className={styles.card}>
              <div className={styles.heading}>Expenses</div>
              <div className={styles.cardRow}>
                <div className={styles.rowLabel}>Rebalansing</div>
                <div className={classNames(styles.rowValue, styles.comingSoon)}>(Coming soon)</div>
              </div>
              <div className={styles.cardRow}>
                <div className={styles.rowLabel}>Open & Close</div>
                <div className={classNames(styles.rowValue, styles.comingSoon)}>(Coming soon)</div>
              </div>
              <div className={styles.cardRow}>
                <div className={styles.rowLabel}>Total</div>
                <div className={classNames(styles.rowValue, styles.comingSoon)}>(Coming soon)</div>
              </div>
            </div>
            <div className={styles.card}>
              <div className={styles.heading}>Profit</div>
              <div className={styles.cardRow}>
                <div className={styles.rowLabel}>Total</div>
                <div className={classNames(styles.rowValue, styles.comingSoon)}>(Coming soon)</div>
              </div>
              <div className={styles.cardRow}>
                <div className={styles.rowLabel}>APY</div>
                <div className={classNames(styles.rowValue, styles.comingSoon)}>(Coming soon)</div>
              </div>
              <div className={styles.cardRow}>
                <div className={styles.rowLabel}>Turnover</div>
                <div className={classNames(styles.rowValue)}>
                  {d3.format(",.2")(historyQuery?.data?.amount_total / total_capacity)}
                </div>
              </div>
            </div>
            <div className={styles.card}>
              <div className={styles.heading}>Automation</div>
              <div className={styles.cardRow}>
                <div className={styles.rowLabel}>
                  <Switch label={"Fees"} />
                </div>
                <div className={classNames(styles.rowValue, styles.comingSoon)}>(Coming soon)</div>
              </div>
              <div className={styles.cardRow}>
                <div className={styles.rowLabel}>
                  <Switch label={"Rebalancing"} />
                </div>
                <div className={classNames(styles.rowValue, styles.comingSoon)}>(Coming soon)</div>
              </div>
              <div className={styles.cardRow}>
                <div className={styles.rowLabel}>
                  <Switch label={"HTLC amount"} />
                </div>
                <div className={classNames(styles.rowValue, styles.comingSoon)}>(Coming soon)</div>
              </div>
            </div>
          </div>

          <div className={classNames(styles.card, styles.channelSummaryChart)}>
            <div className={styles.profitChartControls}>
              <div className={styles.profitChartLeftControls}>
                <Select
                  value={profitKey}
                  onChange={(newValue) => {
                    if (newValue) {
                      dispatch(
                        updateProfitChartKey({
                          key: (newValue as { value: string; label: string }) || {
                            value: "amount",
                            label: "Amount",
                          },
                        })
                      );
                    }
                  }}
                  options={[
                    { value: "amount", label: "Amount" },
                    { value: "revenue", label: "Revenue" },
                    { value: "count", label: "Count" },
                  ]}
                />
              </div>
              <div className={styles.profitChartRightControls}>
                <SettingsIcon />
                Settings
              </div>
            </div>
            <div className={styles.chartContainer}>
              {historyQuery.data && <ProfitsChart data={historyQuery.data.history} />}
            </div>
          </div>
        </div>

        <div className={classNames(styles.pageRow, styles.tripleRow)}>
          <div className={styles.card}>
            <div className={styles.heading}>Amount</div>
            <div className={styles.cardRow}>
              <div className={styles.rowLabel}>Capacity</div>
              <div className={styles.rowValue}>{ft(total_capacity)}</div>
            </div>
            <div className={styles.cardRow}>
              <div className={styles.rowLabel}>Outbound</div>
              <div className={styles.rowValue}>{ft(historyQuery?.data?.amount_out)}</div>
            </div>
            <div className={styles.cardRow}>
              <div className={styles.rowLabel}>Inbound</div>
              <div className={classNames(styles.rowValue)}>{ft(historyQuery?.data?.amount_in)}</div>
            </div>
            <div className={styles.cardRow}>
              <div className={styles.rowLabel}>Total</div>
              <div className={styles.rowValue}>{ft(historyQuery?.data?.amount_total)}</div>
            </div>
            <div className={styles.cardRow}>
              <div className={styles.rowLabel}>Turnover</div>
              <div className={classNames(styles.rowValue)}>
                {d3.format(",.2")(historyQuery?.data?.amount_total / total_capacity)}
              </div>
            </div>
            <div className={styles.cardRow}>
              <div className={styles.rowLabel}>Balance score</div>
              <div className={classNames(styles.rowValue)}>
                {d3.format(".1%")(
                  Math.min(historyQuery?.data?.amount_in, historyQuery?.data?.amount_out) /
                    Math.max(historyQuery?.data?.amount_in, historyQuery?.data?.amount_out)
                )}
              </div>
            </div>
          </div>

          <div className={styles.card}>
            <div className={styles.heading}>Revenue</div>
            <div className={styles.cardRow}>
              <div className={styles.rowLabel}>Outbound</div>
              <div className={styles.rowValue}>{ft(historyQuery?.data?.revenue_out)}</div>
            </div>
            <div className={styles.cardRow}>
              <div className={styles.rowLabel}>Inbound</div>
              <div className={classNames(styles.rowValue)}>{ft(historyQuery?.data?.revenue_in)}</div>
            </div>
            <div className={styles.cardRow}>
              <div className={styles.rowLabel}>Total</div>
              <div className={styles.rowValue}>{ft(historyQuery?.data?.revenue_total)}</div>
            </div>
            <div className={styles.cardRow}>
              <div className={styles.rowLabel}>Average fee out</div>
              <div className={classNames(styles.rowValue)}>
                {d3.format(",.1f")((historyQuery?.data?.revenue_out / historyQuery?.data?.amount_out) * 1000 * 1000)}
              </div>
            </div>
            <div className={styles.cardRow}>
              <div className={styles.rowLabel}>Average fee in</div>
              <div className={classNames(styles.rowValue)}>
                {d3.format(",.1f")((historyQuery?.data?.revenue_in / historyQuery?.data?.amount_in) * 1000 * 1000)}
              </div>
            </div>
            <div className={styles.cardRow}>
              <div className={styles.rowLabel}>Average fee</div>
              <div className={classNames(styles.rowValue)}>
                {d3.format(",.1f")(
                  (historyQuery?.data?.revenue_total / historyQuery?.data?.amount_total) * 1000 * 1000
                )}
              </div>
            </div>
          </div>

          <div className={styles.card}>
            <div className={styles.heading}>Transaction count</div>
            <div className={styles.cardRow}>
              <div className={styles.rowLabel}>Outbound</div>
              <div className={styles.rowValue}>{ft(historyQuery?.data?.count_out)}</div>
            </div>
            <div className={styles.cardRow}>
              <div className={styles.rowLabel}>Inbound</div>
              <div className={classNames(styles.rowValue)}>{ft(historyQuery?.data?.count_in)}</div>
            </div>
            <div className={styles.cardRow}>
              <div className={styles.rowLabel}>Total</div>
              <div className={styles.rowValue}>{ft(historyQuery?.data?.count_total)}</div>
            </div>
            <div className={styles.cardRow}>
              <div className={styles.rowLabel}>Balance score (Nb. Tx)</div>
              <div className={classNames(styles.rowValue)}>
                {d3.format(".1%")(
                  Math.min(historyQuery?.data?.count_in, historyQuery?.data?.count_out) /
                    Math.max(historyQuery?.data?.count_in, historyQuery?.data?.count_out)
                )}
              </div>
            </div>
          </div>
        </div>

        <div className={classNames(styles.pageRow, styles.eventSummary)}>
          <div className={styles.shortColumn}>
            <div className={classNames(styles.card, styles.scroll)} style={{ height: "600px" }}>
              <div className={styles.eventRowsWrapper}>
                {!historyQuery?.data?.events && <div className={styles.eventRowName}>No events</div>}
                {historyQuery?.data?.events &&
                  historyQuery.data.events
                    .filter((d: any) => {
                      return selectedEvents.get(d.type); // selectedEventTypes
                    })
                    .map((event: any, index: number) => {
                      const icon = eventIcons.get(event.type);
                      const newDate = prev !== event.date;
                      const newAlias = prevAlias !== event.channel_point;
                      prev = event.date;
                      prevAlias = event.channel_point;
                      const chan =
                        (historyQuery?.data?.channels || []).find(
                          (c: any) => c.channel_point === event.channel_point
                        ) || {};

                      return (
                        <React.Fragment key={"empty-wrapper-" + index}>
                          {newDate && (
                            <div key={"date-row" + index} className={styles.eventDateRow}>
                              {format(new Date(event.date), "yyyy-MM-dd")}
                            </div>
                          )}
                          {(newDate || newAlias) && (
                            <div key={"name-row" + index} className={styles.eventRowName}>
                              <div className={styles.channelAlias}>{chan.alias}</div>
                              <div>|</div>
                              <div className={styles.channelPoint}>{chan.channel_point}</div>
                            </div>
                          )}
                          <div
                            key={index}
                            className={classNames(
                              styles.eventRow,
                              styles[event.type],
                              styles[event.outbound ? "" : "inbound"]
                            )}
                          >
                            <div className={styles.eventRowDetails}>
                              <div className={styles.datetime}>{format(new Date(event.datetime), "hh:mm")}</div>
                              <div className={"event-type"} dangerouslySetInnerHTML={{ __html: icon as string }} />
                              <div className={"event-type-label"}>
                                {formatEventText(event.type, event.value, event.previous_value, event.outbound)}
                              </div>
                            </div>
                          </div>
                        </React.Fragment>
                      );
                    })}
              </div>
            </div>
          </div>
          <div className={classNames(styles.card, styles.channelSummaryChart)} style={{ height: "600px" }}>
            <div className={styles.profitChartControls}>
              <div className={styles.profitChartLeftControls}>
                <Select
                  value={eventKey}
                  onChange={(newValue) => {
                    if (newValue) {
                      dispatch(
                        updateEventChartKey({
                          key: (newValue as { value: string; label: string }) || {
                            value: "amount",
                            label: "Amount",
                          },
                        })
                      );
                    }
                  }}
                  options={[
                    { value: "amount", label: "Amount" },
                    { value: "revenue", label: "Revenue" },
                    { value: "count", label: "Count" },
                  ]}
                />
              </div>
              <div className={styles.profitChartRightControls}>
                <Popover
                  button={<Button text={"Settings"} icon={<SettingsIcon />} className={"collapse-tablet"} />}
                  className={"right"}
                >
                  <div className={styles.channelChartSettingsPopover}>
                    <div className={styles.cardRow}>
                      <div className={styles.rowLabel}>
                        <Switch
                          label="Toggle all"
                          checkboxProps={{
                            checked: allToggle,
                            onChange: (e) => {
                              setAllToggle(e.target.checked);
                              setSelectedEvents(
                                new Map([
                                  ["fee_rate", e.target.checked],
                                  ["base_fee", e.target.checked],
                                  ["min_htlc", e.target.checked],
                                  ["max_htlc", e.target.checked],
                                  ["enabled", e.target.checked],
                                  ["disabled", e.target.checked],
                                ])
                              );
                            },
                          }}
                        />
                      </div>
                    </div>

                    {Array.from(selectedEvents).map((item) => {
                      return (
                        <div className={styles.cardRow} key={item[0]}>
                          <div className={styles.rowLabel}>
                            <Switch
                              label={eventNames.get(item[0]) || ""}
                              checkboxProps={{
                                checked: selectedEvents.get(item[0]),
                                onChange: handleSelectEventUpdate(item[0]),
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Popover>
              </div>
            </div>

            <div className={styles.chartContainer}>
              {historyQuery.data && (
                <EventsChart
                  data={historyQuery.data.history}
                  events={historyQuery.data.events}
                  selectedEventTypes={selectedEvents}
                />
              )}
            </div>
          </div>
        </div>

        <div className={styles.pageRow}>
          <div className={styles.card}>
            <div className={styles.profitChartControls}>
              <div className={styles.profitChartLeftControls}>
                <Select
                  value={flowKey}
                  onChange={(newValue) => {
                    if (newValue) {
                      dispatch(
                        updateFlowKey({
                          flowKey: (newValue as { value: string; label: string }) || {
                            value: "amount",
                            label: "Amount",
                          },
                        })
                      );
                    }
                  }}
                  options={[
                    { value: "amount", label: "Amount" },
                    { value: "revenue", label: "Revenue" },
                    { value: "count", label: "Count" },
                  ]}
                />
              </div>
              <div className={styles.profitChartRightControls}>
                {/*<Popover*/}
                {/*  button={<Button text={"Settings"} icon={<SettingsIcon />} className={"collapse-tablet"} />}*/}
                {/*  className={"right"}*/}
                {/*>*/}
                {/*  Hello*/}
                {/*</Popover>*/}
              </div>
            </div>
            <div className="legendsContainer">
              <div className="sources">Sources</div>
              <div className="outbound">Outbound</div>
              <div className="inbound">Inbound</div>
              <div className="destinations">Destinations</div>
            </div>
            <div className={classNames(styles.chartWrapper, styles.flowChartWrapper)}>
              {!isLoading && data && <FlowChart data={data} />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ChannelPage;
