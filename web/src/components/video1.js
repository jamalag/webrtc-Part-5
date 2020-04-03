// import Proptypes from 'prop-types';
import React from 'react';
// import Icon from '../common/Icon';

const styles = {
  css: {
    maxHeight: '100%',
    maxWidth: '100%',
    objectFit: 'cover',
    transition: 'opacity 1s ease-in-out'
  },

  flip: {
    css: {
      transform: 'scale(-1, 1)'
    }
  },

  fullScreen: {
    css: {
      height: '100%',
      width: '100%'
    }
  }
};

class Video extends React.PureComponent {
    constructor(props, context) {
        super(props, context);

        this.state = {
                MicColor: '#7fff00',
                CamColor: '#7fff00',
                ScreenColor: '#ccfafd',
                extensionInstalled: false,
                localVideo: true,
                screenShareStream: null
        };

        this.screenCapture = this.screenCapture.bind(this);
        this.screenStreamEnded = this.screenStreamEnded.bind(this);
        this.onToggleAudio = this.onToggleAudio.bind(this);
        this.onToggleVideo = this.onToggleVideo.bind(this);
        this.screenCapture = this.screenCapture.bind(this);
    }

    componentDidMount() {
        if (this.props.video.stream) {
            this.video.srcObject = this.props.video.stream;
            // console.log('Original stream');
        }

        window.addEventListener('message', this.processMessage.bind(this));
    }

    componentWillReceiveProps(nextProps) {
        if (!!nextProps.video.stream && nextProps.video.stream !== this.props.video.stream) {
            this.video.srcObject = nextProps.video.stream;
        }
    }

    processMessage(event) {
        // debugger;
        console.log(event);
        if (event.origin != window.location.origin) return;

        if (event.data.type && (event.data.type === 'SS_PING')) {
            this.setState({
                extensionInstalled: true
            });
        }

        if (event.data.type && (event.data.type === 'SS_DIALOG_SUCCESS')) {
            this.startScreenStreamFrom(event.data.streamId);
        }

        if (event.data.type && (event.data.type === 'SS_DIALOG_CANCEL')) {
            console.log('User cancelled!');
        }
    }

    onToggleAudio() {
        debugger;
        this.video.srcObject.getAudioTracks()[0].enabled = !this.video.srcObject.getAudioTracks()[0].enabled;

        this.setState({
            MicColor: this.video.srcObject.getAudioTracks()[0].enabled ? '#7fff00': 'red'
        });

    }

    onToggleVideo() {
        debugger;
        this.video.srcObject.getVideoTracks()[0].enabled = !this.video.srcObject.getVideoTracks()[0].enabled;

        this.setState({
            CamColor: this.video.srcObject.getVideoTracks()[0].enabled ? '#7fff00': 'red'
        });
    }

    screenCapture() {
        if (this.state.localVideo) {
            if (!this.state.extensionInstalled) {
                window.postMessage({type: 'SS_UI_REQUEST', text: 'start'}, '*');
            }
        } else {

        // debugger;
            this.video.srcObject.getTracks().forEach(track => track.stop());

            // this.video.srcObject = this.props.video.stream;

            // this.props.streamCallback(this.props.video.stream, false);

            // this.updateState();
        }
    }

    updateState() {
        this.setState({
            localVideo: !this.state.localVideo,
            ScreenColor: this.state.localVideo ? '#7fff00' : 'blue'
        });
    }

    screenStreamEnded() {
        debugger;
        // this.screenCapture();
        this.video.srcObject = this.props.video.stream;

        this.props.streamCallback(this.video.srcObject, false);

        this.updateState();
    }

    startScreenStreamFrom(streamId) {

        let constraints = {
            audio: false,
            video: {
            mandatory: {
                chromeMediaSource: 'desktop',
                chromeMediaSourceId: streamId,
                maxWidth: window.screen.width,
                maxHeight: window.screen.height
            }
            }
        };

        try {
            navigator.mediaDevices.getUserMedia(constraints)
            .then((screenShareStream) => {

        // debugger;
                this.video.srcObject = screenShareStream;

                let audioTrack = this.props.video.stream.getAudioTracks()[0];
                this.video.srcObject.addTrack(audioTrack);

                this.props.streamCallback(this.video.srcObject, true);

                this.video.srcObject.getVideoTracks()[0].onended = this.screenStreamEnded;

                this.updateState();

            })
            .catch((e) => {
                console.log('getUserMedia failed!: ' + e);
            });
        }
        catch(e) {
            console.log('Error', e);
        }
    }

    render() {
        const {id, type, muted, screen} = this.props.video;
        // const MICorSPEAKER = id=='local' ? 'MIC' : 'SPEAKER';
        console.log(screen);

        const screenCaptureButton = type=='local' ?
                    <div className="fa fa-desktop" onClick={this.screenCapture} style={{ cursor: 'pointer', color: this.state.ScreenColor, padding: '0 3px' }}/>
                    : '';

        return (
          <div style={{ ...this.props.frameStyle }} >
            <video
              id={id}
              ref={(ref) => {this.video = ref; }}
              muted={muted}
              autoPlay
              // controls
              width='100%'
              style={{
                ...this.props.videoStyle,
                maxWidth: '100%',
                maxHeight: '100%',
                transition: 'opacity 2s ease-in-out',
                transform: type=='local' && this.state.localVideo ? 'scale(-1, 1)' : ''
                }}
            />
            <div style={{ ...this.props.controlsStyle }}>
              <div className={type==='local' ? 'fa fa-microphone' : 'fa fa-volume-up'} onClick={this.onToggleAudio} style={{ cursor: 'pointer', color: this.state.MicColor, padding: '2px 3px' }}/>
              <div className="fa fa-video-camera" onClick={this.onToggleVideo} style={{ cursor: 'pointer', color: this.state.CamColor, padding: '2px 3px' }}/>
              {screenCaptureButton}
            </div>
          </div>
        );
    }
}

export default Video;
