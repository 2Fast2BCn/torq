import { MouseEventHandler } from "react";
import classNames from "classnames";
import styled from "@emotion/styled";

const StyledButton = styled.button`
  background: ${(props: any) => (props.isOpen ? "#ECFAF8" : "none")};
  border: ${(props: any) =>
    props.isOpen ? "1px solid #DDF6F5" : "1px solid transparent"};
  border-radius: 2px;
  display: grid;
  grid-auto-flow: column;
  align-items: center;
  grid-column-gap: 5px;
  padding: 5px 10px;
  cursor: pointer;
  &.small,
  &.small .icon {
    font-size: var(--font-size-small);
  }
  &.small {
    padding: 2px 5px;
  }
  &.danger {
    background-color: var(--secondary-300);
    border: 1px solid var(--secondary-400);
  }
  .text {
    text-overflow: ellipsis;
  }
  @media only screen and (max-width: 1000px) {
    &.small-tablet,
    &.small-tablet .icon {
      font-size: var(--font-size-small);
    }
    &.collapse-tablet {
      padding: 5px 0.5em;
      .text {
        display: none;
      }
    }
  }
`;

function DefaultButton(props: {
  text: string;
  icon?: any;
  onClick?: MouseEventHandler<HTMLButtonElement> | undefined;
  className?: string;
  isOpen?: boolean;
}) {
  return (
    <StyledButton
      //@ts-expect-error
      isOpen={props.isOpen}
      className={classNames("button", props.className)}
      onClick={props.onClick}
    >
      {props.icon && <div className="icon">{props.icon}</div>}
      <div className="text">{props.text}</div>
    </StyledButton>
  );
}

export default DefaultButton;
