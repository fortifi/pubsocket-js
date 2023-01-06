import {css, html, LitElement, PropertyValues} from 'lit';
import {customElement, property} from 'lit/decorators.js';
import {detectPrng, factory} from "ulid";
import {unsafeHTML} from 'lit/directives/unsafe-html.js'
import {checkText} from 'smile2emoji'

const ulid = factory(detectPrng(true));

@customElement('pub-socket')
export class PubSocket extends LitElement // eslint-disable-line @typescript-eslint/no-unused-vars
{
  private _socket: WebSocket | null;
  private _lastMessageTime: number = 0;
  private _failureTime: number = 0;
  protected _messages: Message[] = [];

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

    li[action-type="connected.agent"] {
      background: transparent;
      border: none;
      align-self: center;
    }

    li[action-type="connected.agent"] > span {
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
  `;

  protected render(): unknown {
    return html`
      <ul>
        ${this._messages.map(this.renderMessage.bind(this))}
      </ul>
      ${this.hideSendPanel ? null : html`
        <div id="send-panel">
          <input id="msg" @keypress=${this._inputKeyDown}>
          <button @click="${this._send}">Send</button>
        </div>`
      }
    `;
  }

  protected displayMessage(msg: Message): boolean {
    switch (msg.actionType) {
      case "":
      case "connected.agent":
      case "transfer":
      case "ended":
      case "error":
        return true;
    }
    return false;
  }

  protected renderMessage(msg: Message): unknown {
    if (!this.displayMessage(msg)) {
      return html``;
    }
    return html`
      <li ?customer=${msg.customerInitiated} ?undelivered=${msg.undelivered} action-type="${msg.actionType}">
        <span class="int-msg-who">
          ${msg.author !== "" ? msg.author : (msg.customerInitiated === true ? 'Customer' : 'Agent')}
        </span>
        ${this._prepareMessageContent(msg.content)}
        <span class="int-msg-time">
          ${this._getFormattedTime(msg.time)}
        </span>
      </li>`
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
    if (msg) {
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
        // should we retry, or fail?
        if ((new Date()).getTime() < self._failureTime + (self.retryTimeout * 1000)) {
          // retry
          setTimeout(self.open.bind(self), self.retryDelay * 1000);
        } else {
          self.connectionFailed = true;
          s.close(e.code, e.reason);
        }
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
      if (!updated) {
        self._pushMessage(msg);
      }

      self.requestUpdate();
      self.scrollToEnd();
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
