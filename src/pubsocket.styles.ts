import {css} from "lit";

export default css`
  :host {
    --customer-background-color: #ccf5db;
    position: relative;
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    overflow: auto;
  }

  ul {
    padding: 0;
    display: flex;
    flex-direction: column;
    width: var(--message-container-width, auto);
    margin: var(--message-container-margin, 0);
  }

  li {
    color: #000;
    border-radius: 5px;
    border: 1px solid rgba(0, 0, 0, .1);
    background: var(--agent-background-color, #daf5ff);
    padding: 7px;
    margin: 4px;
    display: flex;
    width: fit-content;
    flex-wrap: wrap;
    align-self: flex-start;
  }

  li[action-type="connected.agent"],
  li[action-type="attachment.added"] {
    background: transparent;
    border: none;
    align-self: center;
  }

  li[action-type="connected.agent"] > span,
  li[action-type="attachment.added"] > span {
    display: none
  }

  li[customer] {
    background: var(--customer-background-color);
    align-self: flex-end;
  }

  li[undelivered] {
    background: lightgray;
  }

  li .int-msg-who {
    opacity: .7;
    font-size: .7em;
    padding: 0 0 3px 0;
    align-self: start;
    flex-basis: 100%;
    font-weight: 700;
  }

  li .int-msg-time {
    opacity: .6;
    font-size: .7em;
    padding: 5px 0 0 5px;
    align-self: end;
    flex-grow: 1;
    text-align: right;
  }

  input, button {
    padding: 5px;
    margin: 5px;
  }

  #msg {
    flex-grow: 1;
  }

  #send-panel {
    display: flex;
    position: sticky;
    bottom: 0;
    width: 100%;
    background: white;
  }

  #agent-typing {
    width: 100%;
    margin: 0 auto;
    font-size: 13px;
  }

  #agent-typing:after {
    overflow: hidden;
    display: inline-block;
    vertical-align: bottom;
    -webkit-animation: ellipsis steps(4, end) 1500ms infinite;
    animation: ellipsis steps(4, end) 1500ms infinite;
    content: "\\2026";
    width: 0;
  }

  .int-msg-answers {
    align-self: flex-end;
    flex-direction: row;
    flex-wrap: wrap;
    gap: 12px;
    background: none;
    border: none;
  }

  .int-msg-answer {
    border: 1px solid var(--customer-multi-color, #0e9dde);
    color: var(--customer-multi-color, #0e9dde);
    padding: 6px 14px;
    border-radius: 8px;
    cursor: pointer;
    margin-bottom: 10px;
  }

  .int-msg-answer:hover {
    background-color: var(--customer-multi-color, #0e9dde);
    color: var(--customer-multi-hover-color, #fff)
  }

  @keyframes ellipsis {
    to {
      width: 10px;
    }
  }
`;
