import React, { Component } from 'react';

import io from 'socket.io-client'

import Video from './components/video'
import Videos from './components/videos'

class App extends Component {
  constructor(props) {
    super(props)

    this.state = {
      localStream: null,    // used to hold local stream object to avoid recreating the stream everytime a new offer comes
      remoteStream: null,    // used to hold remote stream object to avoid recreating the stream everytime a new offer comes

      remoteStreams: [],    // holds all Video Streams (local and all remote streams)
      peerConnections: {},  // holds all Peer Connections

      selectedVideo: null,  

      connecting: true, // Join button: hidden by default
      status: 'Please wait...',

      pc_config: {
        "iceServers": [
          {
            urls : 'stun:stun.l.google.com:19302'
          },
        ]
      },

      sdpConstraints: {
        'mandatory': {
            'OfferToReceiveAudio': true,
            'OfferToReceiveVideo': true
        }
      },
    }

    this.serviceIP = 'https://cc82bd38.ngrok.io'

    // https://reactjs.org/docs/refs-and-the-dom.html
    this.localVideoref = React.createRef()
    this.remoteVideoref = React.createRef()

    this.socket = null
    // this.candidates = []
  }

  getLocalStream = () => {
    // success called when getUserMedia() successfully returns - see below
    // getUserMedia() returns a MediaStream object
    // (https://developer.mozilla.org/en-US/docs/Web/API/MediaStream)
    const success = (stream) => {
      window.localStream = stream
      // store stream to state so that we don't acquire everytime new peer joins
      this.setState({
        localStream: stream
      })

      // then connect to server...
      this.whoisOnline()
    }

    // called when getUserMedia() fails - see below
    const failure = (e) => {
      console.log('getUserMedia Error: ', e)
    }

    // https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia
    // see the above link for more constraint options
    const constraints = {
      // audio: true,
      // video: true,
      // video: {
      //   width: 1280,
      //   height: 720
      // },
      video: {
          width: 1280,
        height: 720,
        frameRate: { ideal: 10, max: 30 },
      },
      options: {
        mirror: true,
      }
    }

    // https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia
    navigator.mediaDevices.getUserMedia(constraints)
      .then(success)
      .catch(failure)
  }

  joinPeers = () => {
    // let all peers know I am joining
    this.sendToPeer('joinPeers', null, this.socket.id)
  }

  whoisOnline = () => {
    // let all peers know I am joining
    this.sendToPeer('onlinePeers', null, {local: this.socket.id})
  }

  sendToPeer = (messageType, payload, socketID) => {
    console.log('Send To Peer:  ', messageType, socketID)
    this.socket.emit(messageType, {
      socketID,
      payload,
    })
  }

  createPeerConnection = (socketID, callback) => {

    try {
      let pc = new RTCPeerConnection(this.state.pc_config)

      // add pc to peerConnections object
      const peerConnections = { ...this.state.peerConnections, [socketID]: pc }
      this.setState({
        peerConnections,
      })

      pc.onicecandidate = (e) => {
        if (e.candidate) {
          this.sendToPeer('candidate', e.candidate, {
            local: this.socket.id,
            remote: socketID
          })
        }
      }

      pc.oniceconnectionstatechange = (e) => {
        if (pc.iceConnectionState === 'disconnected') {
          // remove pc from list
          // const remoteStreams = this.state.remoteStreams.filter(stream => stream.id !== socketID)

          // this.setState({
          //     remoteStream: remoteStreams.length > 0 && remoteStreams[0].stream || null,
          //     // remoteStreams,
          //   }
          // )
        }
      }

      pc.ontrack = (e) => {

        const remoteVideo = {
          id: socketID,
          name: socketID,
          stream: e.streams[0]
        }


        this.setState(prevState => {

          // If we already have a stream in display let it stay the same, otherwise use the latest stream
          const remoteStream = prevState.remoteStreams.length > 0 ? {} : { remoteStream: e.streams[0] }

          // get currently selected video
          let selectedVideo = prevState.remoteStreams.filter(stream => stream.id === prevState.selectedVideo.id)
console.log("SELECTED", selectedVideo.length)
          // if the video is still in the list, then do nothing, otherwise set to new video stream
          selectedVideo = selectedVideo.length ? {} : { selectedVideo: remoteVideo }

          return {
            // selectedVideo: remoteVideo,
            ...selectedVideo,
            // remoteStream: remoteStreams.length > 0 && remoteStreams[0].stream || e.streams[0],
            ...remoteStream,
            remoteStreams: [...prevState.remoteStreams, remoteVideo]
          }
        }, () => {console.log('remoteStreams :::', this.state.remoteStreams)})

        // this.remoteVideoref.current.srcObject = e.streams[0]
      }

      pc.close = () => {
        // alert('GONE')
      }

      if (this.state.localStream)
        pc.addStream(this.state.localStream)

      // return pc
      callback(pc)
    }
    catch (e) {
      console.log('Something went wrong! pc not created!!', e)
      // return;
      callback(null)
    }
  }

  componentDidMount = () => {

    // this.getLocalStream()

    this.socket = io.connect(
      `${this.serviceIP}/webrtcPeer`,
      {
        path: '/io/webrtc',
        query: {}
      }
    )

    this.socket.on('connection-success', data => {

      this.getLocalStream()

      console.log('connection-success: ', data.success, data.peerCount)

      // if (data.peerCount > 1) {
      //   // show Join button
      //   this.setState({
      //     connecting: false
      //   })
      // }

      // this.joinPeers()
      // this.whoisOnline()

      const connecting = data.peerCount > 1 ? false : true
      const status = data.peerCount > 1 ? `Total Connected Peers: ${data.peerCount}` : 'Waiting for other peers to connect'

      // show Join button
      this.setState({
        connecting,
        status: status
      })
    })

    this.socket.on('joined-peers', data => {
      console.log('payload', data)
      // show Join button
      this.setState({
        connecting: false,
        status: `Total Connected Peers: ${data.peerCount}`
      })
    })

    this.socket.on('peer-disconnected', data => {
      console.log('peer-disconnected', data)

      const remoteStreams = this.state.remoteStreams.filter(stream => stream.id !== data.socketID)

      this.setState(prevState => {

        // check if disconnected peer is the selected video and if there still connected peers, then select the first
        const selectedVideo = prevState.selectedVideo.id === data.socketID && remoteStreams.length ? { selectedVideo: remoteStreams[0] } : null

        return {
          remoteStreams,
          ...selectedVideo,
        }
        }
      )
    })

    // this.socket.on('online-peer', data => {
    //   console.log('payload', data)
    //   // show Join button
    //   this.setState({
    //     // connecting: false,
    //     status: `Total Connected Peers: ${data.peerCount}`
    //   })
    // })

    this.socket.on('online-peer', socketID => {
      console.log('online-peer', socketID)

      // create and send offer to the peer (data.socketID)
      // 1. Create new pc
      this.createPeerConnection(socketID, (pc) => {
        // 2. Create Offer
        if (pc)
          pc.createOffer(this.state.sdpConstraints)
            .then(sdp => {

              // set offer sdp as local description
              pc.setLocalDescription(sdp)

              // // add pc to peerConnections object
              // const peerConnections = { ...this.state.peerConnections, [data.socketID]: pc }
              // this.setState({
              //   peerConnections,
              // })

              // send offerer's socketID
              this.sendToPeer('offer', sdp, {
                local: this.socket.id,
                remote: socketID
              })
          })
      })
    })

    this.socket.on('offer', data => {
      // console.log('offer', data)
      // this.textref.value = JSON.stringify(data.sdp)
      // create and send answer to offering peer (data.socketID)
      // 1. Create new pc
      this.createPeerConnection(data.socketID, (pc) => {
        pc.addStream(this.state.localStream)

        pc.setRemoteDescription(new RTCSessionDescription(data.sdp)).then(() => {
          // 2. Create Answer
          pc.createAnswer(this.state.sdpConstraints)
            .then(sdp => {

              // set answer sdp as local description
              pc.setLocalDescription(sdp)

              // // add pc to peerConnections object
              // const peerConnections = { ...this.state.peerConnections, [data.socketID]: pc }
              // this.setState({
              //   peerConnections,
              // })

              this.sendToPeer('answer', sdp, {
                local: this.socket.id,
                remote: data.socketID
              })
          })
        })
      })
    })

    this.socket.on('answer', data => {
      // get remote's peerConnection
      const pc = this.state.peerConnections[data.socketID]

      pc.setRemoteDescription(new RTCSessionDescription(data.sdp)).then(()=>{})
    })

    this.socket.on('candidate', (data) => {
      // get remote's peerConnection
      const pc = this.state.peerConnections[data.socketID]

      if (pc)
        pc.addIceCandidate(new RTCIceCandidate(data.candidate))
    })
  }

  switchVideo = (_video) => {
    console.log(_video)
    this.setState({
      selectedVideo: _video
    })
  }

  render() {
    const {
      localStream,
      remoteStream,
      remoteStreams,
      selectedVideo,
      connecting,
      status
    } = this.state

    // const joinButton = !remoteStream && !connecting && (
    //   <button
    //     style={{ color: 'grey', padding: 5 }}
    //     onClick={this.joinPeers}>Join Conversation</button>
    // ) || (
    //   <div style={{ color: 'yellow', padding: 5 }}>{status}</div>
    // )

    const statusText = <div style={{ color: 'yellow', padding: 5 }}>{status}</div>

    return (
      <div>
        {/* <video
          style={{
            zIndex: 2,
            position: 'absolute',
            right: 0,
            width: 200,
            height: 200,
            margin: 5,
            backgroundColor: 'black',
          }}
          ref={ this.localVideoref }
          autoPlay muted>
        </video> */}
        <Video
          videoStyles={{
            zIndex: 2,
            position: 'absolute',
            right: 0,
            width: 200,
            height: 200,
            margin: 5,
            backgroundColor: 'black',
          }}
          videoStream={localStream}
          // videoRef={this.localVideoref}
          vMuted={true}
        />
        {/* <video
          style={{
            zIndex: 1,
            position: 'fixed',
            bottom: 0,
            minWidth: '100%',
            minHeight: '100%',
            backgroundColor: 'black',
          }}
          ref={ this.remoteVideoref }
          autoPlay>
        </video> */}
        <Video
          videoStyles={{
            zIndex: 1,
            position: 'fixed',
            bottom: 0,
            minWidth: '100%',
            minHeight: '100%',
            backgroundColor: 'black',
          }}
          videoStream={selectedVideo && selectedVideo.stream}
          // videoRef={this.remoteVideoref}
          vMuted={false}
        />
        <br />
        <div style={{
          zIndex: 3,
          position: 'absolute',
          margin: 10,
          backgroundColor: '#cdc4ff4f',
          padding: 10,
          borderRadius: 5,
        }}>
          { statusText }
        </div>
          {/* <br /><br />
          <textarea
            style={{ marginTop: 5, width: 350, height: 80 }}
            ref={ref => { this.textref = ref }} /> */}
        
        <div>
          <Videos
            switchVideo={this.switchVideo}
            remoteStreams={remoteStreams}
            // streamCallback={this.streamCallback}
          />
        </div>
      </div>
    )
  }
}

export default App;