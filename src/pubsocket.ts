import {css, html, LitElement, PropertyValues} from 'lit';
import {customElement, property} from 'lit/decorators.js';
import {detectPrng, factory} from "ulid";
import {unsafeHTML} from 'lit/directives/unsafe-html.js'
import {checkText} from 'smile2emoji'

const ulid = factory(detectPrng(true));

declare type ActionType =
  ''
  | 'transfer'
  | 'attachment.added'
  | 'connected.agent'
  | 'attachment'
  | "ended"
  | "error"
  | "agent.typing"
  | "multi.answer"
  | "hc"
  | "customer.ended";

declare type Message = {
  time: number;
  actionType: ActionType;
  author: string;
  content: string;
  customerInitiated: boolean;
  meta: { [key: string]: string };

  undelivered: boolean;
}

@customElement('pub-socket')
export class PubSocket extends LitElement // eslint-disable-line @typescript-eslint/no-unused-vars
{
  private _socket: WebSocket | null;
  private _lastMessageTime: number = 0;
  private _failureTime: number = 0;
  protected _messages: Message[] = [];
  protected _agentTyping = false;

  public scrolled: boolean = false;

  @property({attribute: 'new-message', reflect: true, type: Boolean})
  public newMessage: boolean = false;
  @property({attribute: 'connected', reflect: true, type: Boolean})
  public connected: boolean = false;
  @property({attribute: 'connection-failed', reflect: true, type: Boolean})
  public connectionFailed: boolean = false;

  @property({attribute: 'hide-send-panel', type: Boolean})
  public hideSendPanel: boolean = false;

  @property({attribute: 'retry-delay', type: Number})
  public retryDelay: number = 2;
  @property({attribute: 'retry-timeout', type: Number})
  public retryTimeout: number = 5;

  @property({attribute: 'socket-host'})
  public socketHost: string = 'wss://socket.fortifi.io';

  @property({attribute: 'chat-fid'})
  public chatFid: string = '';
  @property({attribute: 'chat-ref'})
  public chatRef: string = '';

  public canReply: boolean = true;

  protected _retryAttempts: number = 0;

  static styles = css`
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

  protected render(): unknown {
    return html`
      <ul>
        ${this._messages.map(this.renderMessage.bind(this))}
      </ul>
      ${this._agentTyping ? html`
        <div id="agent-typing">Agent Typing</div>` : null}
      ${this.hideSendPanel ? null : html`
        <div id="send-panel">
          <input id="msg" @keypress=${this._inputKeyDown} ?disabled=${!this.canReply}>
          <button @click="${this._send}">Send</button>
        </div>`
      }
    `;
  }

  protected displayMessage(msg: Message): boolean {
    switch (msg.actionType) {
      case "":
      case "connected.agent":
      case "attachment.added":
      case "multi.answer":
      case "transfer":
      case "ended":
      case "error":
      case "customer.ended":
        return true;
    }
    return false;
  }

  protected renderMessage(msg: Message, index: number): unknown {
    if (!this.displayMessage(msg)) {
      return html``;
    }

    if (msg.actionType === 'multi.answer') {
      return this._htmlMultiAnswer(index, msg);
    }

    return html`
      <li ?customer=${msg.customerInitiated} ?undelivered=${msg.undelivered} action-type="${msg.actionType}">
        ${this._htmlAuthor(msg.author, msg.customerInitiated)}
        ${this._prepareMessageContent(msg.content)}
        ${this._htmlTime(msg.time)}
      </li>`
  }

  _htmlTime(time: number) {
    return html`<span class="int-msg-time">
          ${this._getFormattedTime(time)}
        </span>`
  }

  _htmlAuthor(author: string, customerInitiated: boolean) {
    return html`<span class="int-msg-who">
          ${author !== "" ? author : (customerInitiated ? 'Customer' : 'Agent')}
        </span>`
  }

  _htmlMultiAnswer(index: number, msg: Message) {
    const payload = JSON.parse(msg.content);

    let answers = html``;

    this.canReply = true;
    if (index === this._messages.length - 1) {
      answers = this._htmlAnswers(payload.answers)
      this.canReply = false;
    }

    this.dispatchEvent(new CustomEvent('can.reply', {detail: this.canReply}))

    return html`
      <li ?customer=${false} ?undelivered="${msg.undelivered}" action-type="${msg.actionType}">
        ${this._htmlAuthor(msg.author, msg.customerInitiated)}
        ${this._prepareMessageContent(payload.message)}
        ${this._htmlTime(msg.time)}
      </li>
      ${answers}`
  }

  _htmlAnswers(answers: Array<string>) {
    return html`
      <li class="int-msg-answers">
        ${answers.map(answer => (html`
            <span class="int-msg-answer" @click=${() => this.send(answer)}>
              ${this._prepareMessageContent(answer)}
            </span>`
        ))}
      </li>`;
  }

  _prepareMessageContent(content: string) {

    content = content
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

    content = content.replace(/(\r\n|\r|\n)/g, '<br>');
    content = content.replace(/((http:|https:)[^\S]+[\W])/g, '<a href="$1" target="_blank">$1</a>');
    content = checkText(content)
    content = unsafeHTML(content) as string;
    return content;
  }

  _getFormattedTime(timestamp: number) {
    const d = new Date(timestamp)
    return d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0');
  }

  connectedCallback() {
    super.connectedCallback();
    this.addEventListener('scroll', this._scrollFn)
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener('scroll', this._scrollFn)
  }

  protected updated(_changedProperties: PropertyValues) {
    super.updated(_changedProperties);

    if (_changedProperties.has('chatFid') || _changedProperties.has('chatRef')) {
      this.reset()
      if (this.chatFid !== '' && this.chatRef !== '') {
        this.open();
      }
    }
    this.scrollToEnd();
  }

  _inputKeyDown(evt) {
    if (evt.key.toLowerCase() === 'enter') {
      evt.preventDefault();
      this._send();
    }
  }

  _send() {
    const msg: HTMLInputElement | null = this.renderRoot.querySelector('#msg')
    if (msg && this.canReply) {
      this.send(msg.value);
      msg.value = '';
      this.scrollToEnd(true)
    }
  }

  send(message) {
    if (!this._socket) {
      return false;
    }
    const msg: Message = {
      time: (new Date()).getTime(),
      content: message,
      actionType: '',
      meta: {id: ulid()},
      author: '',
      undelivered: true,
      customerInitiated: true
    }
    this._pushMessage(msg);
    this._socket.send(JSON.stringify(msg));
    this.scrollToEnd();
    return false;
  }

  _pushMessage(msg: Message) {
    this._messages.push(msg);
    this._lastMessageTime = msg.time;

    if ((msg.actionType === "" && msg.content.length > 0) || msg.actionType === 'transfer' || msg.actionType === 'multi.answer') {
      this._agentTyping = false;
    }

    if (msg.actionType === 'agent.typing') {
      this._agentTyping = true;
      this.scrollToEnd();

      setTimeout(() => {
        this._agentTyping = false
      }, 30000)
      return;
    }

    this.requestUpdate();
    if (this.scrolled) {
      this.newMessage = true;
    }
    this.dispatchEvent(new CustomEvent('message', {detail: msg}))
  }

  _scrollFn() {
    this.scrolled = (this.scrollTop + this.clientHeight) !== this.scrollHeight;
    if (!this.scrolled) {
      this.newMessage = false;
    }
  }

  scrollToEnd(force: boolean = false) {
    if (force || !this.scrolled) {
      this.scrollTop = this.scrollHeight;
      this.scrolled = false;
    }
  }

  reset() {
    if (this._socket) {
      this.close();
    }
    this._socket = null;
    this._lastMessageTime = 0;
    this._messages = [];
    this._failureTime = 0;
    this.connectionFailed = false;
    this.scrolled = false;
    this.requestUpdate();
  }

  open() {
    if (this.connected) {
      return true;
    }
    if (this._socket) {
      return true;
    }
    if (this.chatFid === '' || this.chatRef === '') {
      return false;
    }

    if (this.connectionFailed) {
      // already marked as failed, take this open as the start of a new attempt run
      this.reset();
    }

    const self = this; // eslint-disable-line @typescript-eslint/no-this-alias

    const s = new WebSocket([this.socketHost, this.chatFid, this.chatRef, this._lastMessageTime].join('/'));

    s.onopen = function () {
      self.connected = true;
      self.connectionFailed = false;
      self._failureTime = 0;
      self._retryAttempts = 0;
    }

    s.onclose = function (e) {
      self.connected = false;
      if (e.wasClean) {
        self.reset();
      } else {
        // set as failed
        self._socket = null;
        if (self._failureTime <= 0) {
          self._failureTime = (new Date()).getTime();
        }

        // Keep Retrying with exponential backoff
        const delay = Math.min(Math.pow(2, self._retryAttempts) * self.retryDelay, 20);
        console.log('Reconnect in ' + delay + 's');
        setTimeout(() => {
          self._retryAttempts++;
          self.open();
        }, delay * 1000);
      }
    };

    s.onmessage = function (evt) {
      const msg: Message = JSON.parse(evt.data);
      let updated = false;
      if (typeof msg.meta?.id !== 'undefined') {
        // update existing message
        self._messages.forEach(m => {
          if (m.meta?.id === msg.meta?.id) {
            Object.assign(m, msg);
            m.undelivered = false;
            updated = true;
          }
        });
      }

      if (!updated && msg.actionType !== 'hc') {
        self._pushMessage(msg);
      }

      self.requestUpdate();
      self.scrollToEnd(true);
    };

    this._socket = s;

    return true;
  }

  close() {
    if (!this._socket) {
      return false;
    }
    this._socket.close(1000);
    return false;
  }
}
