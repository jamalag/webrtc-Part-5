import React, { Component } from 'react';

class Video extends Component {
  constructor(props) {
    super(props)

    this.state = {

    }
  }

  componentDidMount() {
      // if (this.props.videoRef) {
      //     this.video.srcObject = this.props.videoRef.srcObject;
      // }
  }

  render() {
    const {
      id,
      videoStyles,
      muted,
      videoRef
    } = this.props

    return (
      <div>
        <video
          id={id}
          ref={(ref) => {this.video = ref; }}
          muted={muted}
          autoPlay
          style={{ ...videoStyles }}
          ref={ videoRef }
        ></video>
      </div>
    )
  }
}

export default Video