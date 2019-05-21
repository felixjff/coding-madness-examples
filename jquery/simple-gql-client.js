
// Below is the simple version of apollo-gql-client.js

// Only use this if you cannot install apollo client and are willing to give up stability

const DEBUG = true
const log = DEBUG ? console.log : (..._) => { }

// Our gql function doesn't do anything
const gql = (_) => _[0]

class SimpleGQLClient {

  uri
  wsUri
  authorization

  constructor(uri, wsUri, authorization) {
    this.uri = uri
    this.wsUri = wsUri
    this.authorization = authorization
  }

  async query(options) {

    return this.exec(options.query)
  }

  async mutate(options) {

    return this.exec(options.mutation, options.variables)
  }

  subscribe(options) {

    return new SimpleWebSocket(options, this.wsUri, this.authorization)
  }

  async exec(query, variables = {}) {

    // Perform a simple POST call to the server with JSON data
    const res = await fetch(this.uri, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: this.authorization
      },
      body: JSON.stringify({
        operationName: null,
        variables,
        query
      })
    })

    // Parse the JSON
    return await res.json()
  }
}

// This class represents a fake observable
class SimpleWebSocket {

  ws
  id
  wsUri
  authorization
  options
  _next
  _error

  constructor(options, wsUri, authorization) {
    this.options = options
    this.wsUri = wsUri
    this.authorization = authorization

    this.createWebsocket()
  }

  createWebsocket() {

    this.ws = new WebSocket(this.wsUri, "graphql-ws")
    this.id = Math.floor(Math.random() * 1000)

    this.ws.onopen = () => {

      log(`SOCK[${this.id}] opened`)

      // 1. Send the initial connection_init with the auth headers
      this.ws.send(JSON.stringify({
        type: "connection_init",
        payload: { Authorization: this.authorization }
      }))
    }

    this.ws.onmessage = (message) => {

      const data = JSON.parse(message.data)

      log(`SOCK[${this.id}] message: ` + data.type)

      if (data.type === "connection_ack") {

        // 2. Send the subscription query
        this.ws.send(JSON.stringify({
          id: "1",
          type: "start",
          payload: {
            variables: {},
            extensions: {},
            operationName: null,
            query: this.options.query
          }
        }))

      } else if (data.type === "data") {

        // 3. We received data
        if (this._next) this._next(data.payload)

      } else if (data.type === "complete") {

        // 5. The server has closed the connection
        this.ws.close()
      }
    }

    this.ws.onclose = () => {

      // Can also happen because of a network error
      if (this._next) {

        // We did not unsubscribe, reconnect
        log(`SOCK[${this.id}] closed, reconnecting...`)

        setTimeout(() => this.createWebsocket(), 1000)
      } else {
        log(`SOCK[${this.id}] closed, not reconnecting (no subscribers)`)
      }

    }

    this.ws.onerror = (e) => {

      if (this._error) this._error(`SOCK[${this.id}] unexpected error: ${e.message || "-"}`)
      this.ws.close()
    }

    log(`SOCK[${this.id}] started`)
  }

  subscribe({ next, error }) {
    this._next = next
    this._error = error
    return this
  }

  unsubscribe() {

    log(`SOCK[${this.id}] closed by user (client)`)

    this._next = null
    this._error = null

    // 4. Send a close request to the server
    this.ws.send(JSON.stringify({
      id: "1",
      type: "stop"
    }))
  }
}