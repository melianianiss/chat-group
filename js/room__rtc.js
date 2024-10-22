const APP_ID = "7ea9c63a32b0465c8401161ecb202432";  // Your Agora App ID
let uid = sessionStorage.getItem("uid");

if (!uid) {
    uid = String(Math.floor(Math.random() * 10000));
    sessionStorage.setItem("uid", uid);
}

let token = null;  // Token can be null if you have token authentication disabled.
let queryString = window.location.search;
let urlParams = new URLSearchParams(queryString);
let roomId = urlParams.get('room');
let localScreenTracks;
let sharingScreen = false;


if (!roomId) {
    roomId = "main";
}
let displayName=sessionStorage.getItem('display_name');
if(!displayName){
    window.location.href="lobby.html";
} 


let client;
let localTracks = [];
let remoteUsers = {};
let rtmClient;
let channel;

// Initialize and join the room
let JoinRoomInit = async () => {
    rtmClient = AgoraRTM.createInstance(APP_ID);
    await rtmClient.login({ uid, token });

    await rtmClient.addOrUpdateLocalUserAttributes({ "name": displayName });

    channel = rtmClient.createChannel(roomId);
    await channel.join();

    channel.on("MemberJoined", handleMemberJoined);
    channel.on("MemberLeft", handleMemberLeft);
    channel.on("ChannelMessage", handleChannelMessage);
    getMembers();
    addBotMessageToDom(`👋 welcome ${displayName} to the room`);

    client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
    await client.join(APP_ID, roomId, token, uid);

    client.on("user-published", handleUserPublished);
    client.on("user-left", handleUserLeft);



}

// Joining the stream
let joinStream = async () => {
    document.getElementById("join__btn").style.display = "none";
    document.getElementsByClassName("stream__actions")[0].style.display = "flex";
    localTracks = await AgoraRTC.createMicrophoneAndCameraTracks({}, {
        encoderConfig: {
            width: { min: 640, ideal: 1920, max: 1920 },
            height: { min: 480, ideal: 1080, max: 1080 }
        }
    });

    // Add local user video to the stream container
    let player = `<div class="video__container" id="user-container-${uid}">
                    <div class="video-player" id="user-${uid}"></div>
                  </div>`;
    document.getElementById("streams__container").insertAdjacentHTML("beforeend", player);
    document.getElementById(`user-container-${uid}`).addEventListener("click", expandVideoFrame);
    // Play the local video track
    localTracks[1].play(`user-${uid}`);
    await client.publish([localTracks[0], localTracks[1]]);  // Publish both audio and video tracks
}
let SwitchToCamera = async () => {
    let player = `<div class="video__container" id="user-container-${uid}">
                    <div class="video-player" id="user-${uid}"></div>
                  </div>`;
    displayFrame.insertAdjacentHTML("beforeend", player);
    await localTracks[1].setMuted(true);  // Ensure camera is not muted
    localTracks[1].play(`user-${uid}`);
    await client.publish([localTracks[1]]);  // Publish the video track again
}
// Handling other users joining the room
let handleUserPublished = async (user, mediaType) => {
    remoteUsers[user.uid] = user;
    await client.subscribe(user, mediaType);

    let player = document.getElementById(`user-container-${user.uid}`);
    if (!player) {
        player = `<div class="video__container" id="user-container-${user.uid}">
                    <div class="video-player" id="user-${user.uid}"></div>
                  </div>`;
        document.getElementById("streams__container").insertAdjacentHTML("beforeend", player);
        document.getElementById(`user-container-${user.uid}`).addEventListener("click", expandVideoFrame);
    }
    if (displayFrame.style.display) {
        player.style.width = '120px';
        player.style.height = '120px';
    }
    if (mediaType === "video") {
        if (user.videoTrack) {
            user.videoTrack.play(`user-${user.uid}`);
        }
    }

    if (mediaType === "audio") {
        if (user.audioTrack) {
            user.audioTrack.play();
        }
    }
}

// Handling users leaving the room
let handleUserLeft = async (user) => {
    delete remoteUsers[user.uid];
    let Item=document.getElementById(`user-container-${user.uid}`);
    if (Item) {
        Item.remove();
    }
    let player = document.getElementById(`user-container-${user.uid}`);
    if (player) {
        player.remove();
    }

    if (userIdInDisplayFrame === `user-container-${user.uid}`) {
        displayFrame.style.display = 'none';
    }
    let videoFrames = document.getElementsByClassName('video__container');
    for (let i = 0; i < videoFrames.length; i++) {
        videoFrames[i].style.height = '300px';
        videoFrames[i].style.width = '300px';
    }
}
let ToggleCamera = async (e) => {
    let button = e.currentTarget;
    if (localTracks[1].muted) {
        localTracks[1].setMuted(false);
        button.classList.add('active');
    } else {
        localTracks[1].setMuted(true);
        button.classList.remove('active');
    }
}
let ToggleMic = async (e) => {
    let button = e.currentTarget;
    if (localTracks[0].muted) {
        localTracks[0].setMuted(false);
        button.classList.add('active');
    } else {
        localTracks[0].setMuted(true);
        button.classList.remove('active');
    }
}

let ToggleScreenShare = async (e) => {
    let shareButton = e.currentTarget;
    let cameraButton = document.getElementById("camera-btn");

    if (!sharingScreen) {
        sharingScreen = true;
        shareButton.classList.add('active');
        cameraButton.classList.remove('active');
        cameraButton.style.display = "none";

        // Create screen video track
        localScreenTracks = await AgoraRTC.createScreenVideoTrack();
        document.getElementById(`user-container-${uid}`).remove();

        displayFrame.style.display = 'block';
        let player = `<div class="video__container" id="user-container-${uid}">
                        <div class="video-player" id="user-${uid}"></div>
                      </div>`;
        displayFrame.insertAdjacentHTML("beforeend", player);
        document.getElementById(`user-container-${uid}`).addEventListener("click", expandVideoFrame);
        userIdInDisplayFrame = `user-container-${uid}`;

        // Play and publish screen tracks
        localScreenTracks.play(`user-${uid}`);
        await client.unpublish([localTracks[1]]);  // Unpublish camera video
        await client.publish([localScreenTracks]); // Publish screen video
        let videoFrames = document.getElementsByClassName('video__container');
        for (let i = 0; i < videoFrames.length; i++) {
            videoFrames[i].style.height = '120px';
            videoFrames[i].style.width = '120px';
        }
    } else {
        // Stop screen sharing
        sharingScreen = false;
        shareButton.classList.remove('active');
        cameraButton.classList.add('active');
        cameraButton.style.display = "block";

        // Unpublish screen tracks and remove them from DOM
        document.getElementById(`user-container-${uid}`).remove();
        await client.unpublish([localScreenTracks]);

        // Re-publish camera tracks
        await SwitchToCamera();
    }
}
let leaveStream = async (e) => {
    e.preventDefault();
    document.getElementById("join__btn").style.display = "block";
    document.getElementsByClassName("stream__actions")[0].style.display = "none";

    for (let i = 0; i < localTracks.length; i++) {
        localTracks[i].stop();
        localTracks[i].close();
    }
    await client.unpublish([localTracks[1], localTracks[0]]);

    if (sharingScreen) {
        await client.unpublish([localScreenTracks]);
        sharingScreen = false;
    }
    document.getElementById(`user-container-${uid}`).remove();
 
    if (userIdInDisplayFrame===`user-container-${uid}`) {
        displayFrame.style.display = null;
        for(let i=0;i<videoFrames.length;i++){
            videoFrames[i].style.height='300px';
            videoFrames[i].style.width='300px';
        }
    }
        
    channel.sendMessage({
        text: JSON.stringify({ 'type': 'user_left'})
    });

}


document.getElementById("screen-btn").addEventListener("click", ToggleScreenShare);
document.getElementById("camera-btn").addEventListener("click", ToggleCamera);
document.getElementById("mic-btn").addEventListener("click", ToggleMic);
document.getElementById("join__btn").addEventListener("click",joinStream);
document.getElementById("leave-btn").addEventListener("click",leaveStream);



// Initialize the room and join
JoinRoomInit();