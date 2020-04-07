import React, { Component } from 'react';

class Video extends Component {
  constructor(props) {
    super(props)

    this.state = {

    }

    // this.videoRef = React.createRef()
  }

  componentDidMount() {
    // if (this.props.videoRef && this.props.videoRef.srcObject) {
    //     this.video = this.props.videoRef.srcObject
    // } else {
    //   this.video = this.props.videoRef
    // }
    // this.video.current.srcObject = this.props.videoStream

    if (this.props.videoStream) {
      debugger
      this.video.srcObject = this.props.videoStream
    }
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.videoStream && nextProps.videoStream !== this.props.videoStream) {
      this.video.srcObject = nextProps.videoStream;
    }
  }

  render() {
    const {
      id,
      videoStyles,
      muted,
      frameStyle,
      videoRef,
      // videoStream,
    } = this.props

    // console.log('STREAM  ', videoStream)
    // if(videoStream)
    //     this.videoRef.current.srcObject = videoStream

    return (
      <div
        style={{ ...frameStyle }}
      >
        <video
          id={id}
          ref={ (ref) => {this.video = ref } }
          muted={muted}
          autoPlay
          style={{ ...videoStyles }}
          // ref={ videoRef }
        ></video>
      </div>
    )
  }
}

export default Video