
import React from 'react';
import Video from './video';



class Videos extends React.PureComponent {
    constructor(props, context) {
        super(props, context);

        this.state = {
            remoteStreams: [],
            rVideos: []
        };
    }

    componentWillReceiveProps(nextProps) {
        debugger;
        if (this.props.remoteStreams !== nextProps.remoteStreams) {

            let _rVideos = nextProps.remoteStreams.map((rVideo, index) => {
// alert(index)
                let video = <Video
                  // videoRef={rVideo.stream}

                  videoStream={rVideo.stream}
                  frameStyle={{ width: 120, float: 'left', padding: '0 3px' }}
                  videoStyles={{
                    cursor: 'pointer',
                    objectFit: 'cover',
                    borderRadius: 3,
                    width: '100%',
                  }}
                  // streamCallback={this.props.streamCallback}
                />

                return (
                  <div
                    id={rVideo.name}
                    // onClick={() => console.log(rVideo)}
                    onClick={() => this.props.switchVideo(rVideo)}
                    // className={rVideo.class}
                    style={{ display: 'inline-block' }}
                    key={index}
                  >
                    { video }
                  </div>
                );
            });

            this.setState({
                remoteStreams: nextProps.remoteStreams,
                rVideos: _rVideos
            });
        }
    }

    // switchVideo = () => {
    //   debugger
    // }

    render() {
      return (
        // <section
        //   id="videoSection"
        //   ref={(ref) => { this.section = ref }}
        //   style={{display: 'inline-block'}}
        // >
        <div style={{
          zIndex: 3,
          position: 'fixed',
          padding: '6px 3px',
          backgroundColor: 'rgba(0,0,0,0.3)',
          // height: 120,
          maxHeight: 120,
          top: 'auto',
          right: 10,
          left: 10,
          bottom: 10,
          overflowX: 'scroll',
          whiteSpace: 'nowrap'
        }}>
          {this.state.rVideos}
        </div>
        // </section>
      );
    }
}


export default Videos;
