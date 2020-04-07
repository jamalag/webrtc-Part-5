
const express = require('express')

var io = require('socket.io')
({
  path: '/io/webrtc'
})

const app = express()
const port = 8080

// app.get('/', (req, res) => res.send('Hello World!!!!!'))

//https://expressjs.com/en/guide/writing-middleware.html
app.use(express.static(__dirname + '/build'))
app.get('/', (req, res, next) => {
    res.sendFile(__dirname + '/build/index.html')
})

const server = app.listen(port, () => console.log(`Example app listening on port ${port}!`))

io.listen(server)

// default namespace
// io.on('connection', socket => {
//   console.log('connected')
// })

// https://www.tutorialspoint.com/socket.io/socket.io_namespaces.htm
const peers = io.of('/webrtcPeer')

// keep a reference of all socket connections
let connectedPeers = new Map()

peers.on('connection', socket => {

  connectedPeers.set(socket.id, socket)

  console.log(socket.id)
  socket.emit('connection-success', {
    success: socket.id,
    peerCount: connectedPeers.size,
  })

  const broadcast = () => socket.broadcast.emit('joined-peers', {
    peerCount: connectedPeers.size,
  })
  broadcast()

  const disconnectedPeer = (socketID) => socket.broadcast.emit('peer-disconnected', {
    peerCount: connectedPeers.size,
    socketID: socketID
  })

  socket.on('disconnect', () => {
    connectedPeers.delete(socket.id)
    console.log('disconnected', connectedPeers.size)
    disconnectedPeer(socket.id)
  })

  socket.on('onlinePeers', (data) => {
    for (const [socketID, _socket] of connectedPeers.entries()) {
      // don't send to self
      if (socketID !== data.socketID.local) {
        console.log('online-peer', data, socketID)
        socket.emit('online-peer', socketID)
      }
    }
  })

  socket.on('joinPeers', (data) => {
    for (const [socketID, socket] of connectedPeers.entries()) {
      // don't send to self
      if (socketID !== data.socketID) {
        // console.log(socketID)
        socket.emit('new-peer', data)
      }
    }
  })

  socket.on('offer', (data) => {
    // send offer to the identified peer
    for (const [socketID, socket] of connectedPeers.entries()) {

      // console.log(socketID, data.socketID.remote)

      if (socketID === data.socketID.remote) {
        console.log('Offer', socketID, data.socketID, data.payload.type)
        socket.emit('offer', {
            sdp: data.payload,
            socketID: data.socketID.local
          }
        )
      }
    }
  })

  socket.on('answer', (data) => {
    // send answer sdp to peer offerer
    for (const [socketID, socket] of connectedPeers.entries()) {

      // console.log(socketID, data.socketID.remote)

      if (socketID === data.socketID.remote) {
        console.log('Answer', socketID, data.socketID, data.payload.type)
        socket.emit('answer', {
            sdp: data.payload,
            socketID: data.socketID.local
          }
        )
      }
    }
  })

  socket.on('candidate', (data) => {
    // send candidate to the other peer(s) if any
    for (const [socketID, socket] of connectedPeers.entries()) {

      // console.log(socketID, data.payload)

      if (socketID === data.socketID.remote) {
        // console.log(socketID, data.payload)
        socket.emit('candidate', {
          candidate: data.payload,
          socketID: data.socketID.local
        })
      }
    }
  })

  // socket.on('offerOrAnswer', (data) => {
  //   // send to the other peer(s) if any
  //   // but if type=answer, then need to send to the offerer (only)
  //   // data.socketID is the offerer
  //   for (const [socketID, socket] of connectedPeers.entries()) {
  //     // don't send to self and if type:answer then to offerer only
  //     if ((data.payload.type === 'offer' && socketID !== data.socketID) || (data.payload.type === 'answer' && socketID === data.socketID)) {
  //       console.log(socketID, data.socketID, data.payload.type)
  //       socket.emit('offerOrAnswer', {
  //           sdp: data.payload,
  //           socketID: data.socketID
  //         }
  //       )
  //     }
  //   }
  // })

  // socket.on('candidate', (data) => {
  //   // send candidate to the other peer(s) if any
  //   for (const [socketID, socket] of connectedPeers.entries()) {
  //     // don't send to self
  //     if (socketID !== data.socketID) {
  //       // console.log(socketID, data.payload)
  //       socket.emit('candidate', data.payload)
  //     }
  //   }
  // })

})