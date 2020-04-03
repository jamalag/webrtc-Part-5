
import React from 'react';
import Video from './video';



class Videos extends React.PureComponent {
    constructor(props, context) {
        super(props, context);

        this.state = {
            SessionVideos: [],
            rVideos: []
        };
    }

    componentWillReceiveProps(nextProps) {
        debugger;
        if (this.props.SessionVideos !== nextProps.SessionVideos) {

            let _rVideos = nextProps.SessionVideos.map((rVideo, index) => {

                // let video = <video id={rVideo.id} src= {URL.createObjectURL(rVideo.stream)} controls width="100%" height="100%" autoPlay="autoplay" muted={rVideo.muted}/>;

                let video = <Video
                              video={rVideo}
                              frameStyle={{ width: 120, float: 'left', padding: '0 3px' }}
                              videoStyle={{ cursor: 'pointer', objectFit: 'cover', borderRadius: 3, width: '100%' }}
                              streamCallback={this.props.streamCallback}
                            />

                return (
                    <div id={rVideo.name} onClick={() => this.props.switchVideo(rVideo)} className={rVideo.class} key={index}>
                        {video}
                    </div>
                );
            });

            this.setState({
                SessionVideos: nextProps.SessionVideos,
                rVideos: _rVideos
            });
        }
    }

    switchVideo = () => {
      debugger
    }

    render() {
        return (
            <section id="videoSectionWeengu" ref={(ref)=> {this.section = ref}}>
                {this.state.rVideos}
            </section>
        );
    }
}


export default Videos;
