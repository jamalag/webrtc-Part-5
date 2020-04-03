import React, { Component } from 'react';

import io from 'socket.io-client'

import Video from './components/video'

class App extends Component {
  constructor(props) {
    super(props)

    this.state = {
      peerconnection: null,
      peerconnections: [],  // holds all Peer Connections
      localStream: null,    // used to hold local stream object to avoid recreating the stream everytime a new offer comes
      sessionStream: [],    // holds all Video Streams (local and all remote streams)

      pc_config: {
        "iceServers": [
          {
            urls : 'stun:stun.l.google.com:19302'
          }
        ]
      },

      sdpConstraints: {
        'mandatory': {
            'OfferToReceiveAudio': true,
            'OfferToReceiveVideo': true
        }
      },
    }

    this.serviceIP = 'https://86a0d176.ngrok.io'

    // https://reactjs.org/docs/refs-and-the-dom.html
    this.localVideoref = React.createRef()
    this.remoteVideoref = React.createRef()

    this.socket = null
    this.candidates = []
  }

  componentDidMount = () => {

    this.socket = io.connect(
      `${this.serviceIP}/webrtcPeer`,
      {
        path: '/io/webrtc',
        query: {}
      }
    )

    this.socket.on('connection-success', data => {
      console.log(data.success, data.peerCount)

      // if (data.peerCount > 1) {
      //   this.createOffer()
      // }
    })

    this.socket.on('offerOrAnswer', (payload) => {

      this.textref.value = JSON.stringify(payload.sdp)

      // set sdp as remote description
      this.pc.setRemoteDescription(new RTCSessionDescription(payload.sdp)).then(() => {
        if (payload.sdp.type === 'offer') 
          this.createAnswer(payload.socketID) // offerer's socketID sent back
      })
    })

    this.socket.on('candidate', (candidate) => {
      // console.log('From Peer... ', JSON.stringify(candidate))
      // this.candidates = [...this.candidates, candidate]
      this.pc.addIceCandidate(new RTCIceCandidate(candidate))
    })

    // https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection
    // create an instance of RTCPeerConnection
    this.pc = new RTCPeerConnection(this.state.pc_config)

    // triggered when a new candidate is returned
    this.pc.onicecandidate = (e) => {
      // send the candidates to the remote peer
      // see addCandidate below to be triggered on the remote peer
      if (e.candidate) {
        // console.log(JSON.stringify(e.candidate))
        this.sendToPeer('candidate', e.candidate, this.socket.id)
      }
    }

    // triggered when there is a change in connection state
    this.pc.oniceconnectionstatechange = (e) => {
      console.log(e)
    }

    this.pc.ontrack = (e) => {
      debugger
      this.remoteVideoref.current.srcObject = e.streams[0]
    }

    // called when getUserMedia() successfully returns - see below
    // getUserMedia() returns a MediaStream object (https://developer.mozilla.org/en-US/docs/Web/API/MediaStream)
    const success = (stream) => {
      window.localStream = stream
      this.localVideoref.current.srcObject = stream
      this.pc.addStream(stream)
    }

    // called when getUserMedia() fails - see below
    const failure = (e) => {
      console.log('getUserMedia Error: ', e)
    }

    // https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia
    // see the above link for more constraint options
    const constraints = {
      // audio: true,
      video: true,
      // video: {
      //   width: 1280,
      //   height: 720
      // },
      // video: {
      //   width: { min: 1280 },
      // }
      options: {
        mirror: true,
      }
    }

    // https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia
    navigator.mediaDevices.getUserMedia(constraints)
      .then(success)
      .catch(failure)
  }

  sendToPeer = (messageType, payload, socketID) => {
    this.socket.emit(messageType, {
      socketID,
      payload
    })
  }

  /* LATEST CODE - Methods */
/* ----------------------------------------- */
  getUserMedia = (successCallback, errorCallback) => {

    if (this.state.localStream != null) return

    const constraints = {
      'audio': true,
      'video': {
          'mandatory': {},
          'optional': []
      }
    }

    try {
      navigator.mediaDevices.getUserMedia(constraints).then(stream => {

        const localVideo = {
          id: stream.id,
          name: 'lVideo1',
          class: 'lVideo',
          muted: 'muted',     // local stream is muted by default
          stream: stream,
          type: 'local'
        }

        let newSessionVideos = this.state.SessionVideos.filter(x => x.type !== 'local')

        this.setState({
            SessionVideos: [localVideo, ...newSessionVideos],   // Append localVideo to existing SessionVideos
            localStream: stream,
            selectedVideo: localVideo
        })

        if (successCallback) successCallback(stream)

      }).catch(e => {
        console.log(e)
      })
    } catch (e) {
      if (errorCallback) errorCallback()
    }
  }

  addPeer = (initiator, socketID) => {
    // const pc_config = {
    //   "iceServers": [
    //     {
    //       urls : 'stun:stun.l.google.com:19302'
    //     }
    //   ]
    // }

    try {
      let pc = new RTCPeerConnection(this.state.pc_config)

      pc.onicecandidate = (e) => {
        if (e.candidate) {
          this.sendToPeer('candidate', e.candidate)
        }
      }

      pc.oniceconnectionstatechange = (e) => {
        console.log(e)
      }

      pc.ontrack = (e) => {
        let remoteVideo = {
          id: socketID,
          name: socketID,
          class: 'lVideo',
          muted: 'muted',
          screen: false,
          stream: e.streams[0],
          type: 'remote'
        }

        this.setState(prevState => {
          return {
            sessionStream: [ ...prevState.sessionStream, remoteVideo ]
          }
        })
      }

      pc.addStream(this.state.localStream)

      pc.close = () => { }

      const pcDetails = {
        peerconnection: pc,
        remoteVideoID: socketID,
      }

      this.setState({
        peerconnection: pc,
        peerconnections: [...this.state.peerConnections, pcDetails]
      })

      if (initiator) {
        pc = this.createOffer(pc, socketID, false)
      }

      return pc
    }
    catch (e) {
      alert('Something went wrong!')
      return;
    }
  }

  _createOffer = (pc, socketID) => {
    pc.createOffer(this.state.sdpConstraints).then(sdp => {
      pc.setLocalDescription(sdp)
      this.sendToPeer('offerOrAnswer', sdp)
    })

    return pc
  }

  _createAnswer(pc, remoteSocketID, changeStreams) {
    pc.createAnswer(this.state.sdpConstraints).then(sdp => {
      pc.setLocalDescription(sdp)
      this.sendToPeer('offerOrAnswer', sdp)
    })
  }

  /* ----------------------------------------- */

  /* ACTION METHODS FROM THE BUTTONS ON SCREEN */

  createOffer = () => {
    console.log('Offer')

    // https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/createOffer
    // initiates the creation of SDP
    this.pc.createOffer({ manadatory: {offerToReceiveVideo: true} })
      .then(sdp => {

        // set offer sdp as local description
        this.pc.setLocalDescription(sdp)

        // send offerer's socketID
        this.sendToPeer('offerOrAnswer', sdp, this.socket.id)
    })
  }

  // https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/createAnswer
  // creates an SDP answer to an offer received from remote peer
  createAnswer = (socketID) => {
    console.log('Answer')
    this.pc.createAnswer({ offerToReceiveVideo: 1 })
      .then(sdp => {
        // console.log(JSON.stringify(sdp))

        // set answer sdp as local description
        this.pc.setLocalDescription(sdp)

        this.sendToPeer('offerOrAnswer', sdp, socketID)
    })
  }

  setRemoteDescription = () => {
    // retrieve and parse the SDP copied from the remote peer
    const desc = JSON.parse(this.textref.value)

    // set sdp as remote description
    this.pc.setRemoteDescription(new RTCSessionDescription(desc))
  }

  // addCandidate = () => {
  //   // retrieve and parse the Candidate copied from the remote peer
  //   // const candidate = JSON.parse(this.textref.value)
  //   // console.log('Adding candidate:', candidate)

  //   // add the candidate to the peer connection
  //   // this.pc.addIceCandidate(new RTCIceCandidate(candidate))

  //   this.candidates.forEach(candidate => {
  //     console.log(JSON.stringify(candidate))
  //     this.pc.addIceCandidate(new RTCIceCandidate(candidate))
  //   });
  // }

  render() {

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
          videoRef={this.localVideoref}
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
          videoRef={this.remoteVideoref}
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
          <button onClick={this.createOffer}>Join Conversation</button>
          {/* <button onClick={this.createAnswer}>Answer</button> */}

          <br /><br />
          <textarea
            style={{ marginTop: 5, width: 350, height: 80 }}
            ref={ref => { this.textref = ref }} />
        </div>
        <div style={{
          zIndex: 3,
          position: 'fixed',
          backgroundColor: '#cdc4ff4f',
          padding: 10,
          bottom: 0,
          minWidth: '100%',
          minHeight: 140,
        }}>
          <div>Some text</div>
        </div>
        {/* <br />
        <button onClick={this.setRemoteDescription}>Set Remote Desc</button>
        <button onClick={this.addCandidate}>Add Candidate</button> */}
      </div>
    )
  }
}

export default App;