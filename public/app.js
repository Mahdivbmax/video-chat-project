const socket = io();
let localStream;
let remoteStream;
let peerConnection;
let roomId;

const configuration = {
    iceServers: [
        {
            urls: [
                'stun:stun.l.google.com:19302',
                'stun:stun1.l.google.com:19302'
            ]
        }
    ]
};

// دریافت المان‌های DOM
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const startButton = document.getElementById('startButton');
const callButton = document.getElementById('callButton');
const hangupButton = document.getElementById('hangupButton');
const roomInput = document.getElementById('roomInput');
const joinButton = document.getElementById('joinButton');

// تنظیم event listener ها
startButton.addEventListener('click', startCall);
callButton.addEventListener('click', createOffer);
hangupButton.addEventListener('click', hangup);
joinButton.addEventListener('click', joinRoom);

async function startCall() {
    try {
        localStream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: true
        });
        localVideo.srcObject = localStream;
        startButton.disabled = true;
        callButton.disabled = false;
        roomInput.disabled = false;
        joinButton.disabled = false;
    } catch (e) {
        console.error('خطا در دسترسی به دوربین و میکروفون:', e);
    }
}

function joinRoom() {
    roomId = roomInput.value;
    if (roomId) {
        socket.emit('join', roomId);
        setupPeerConnection();
    } else {
        alert('لطفاً یک شناسه اتاق وارد کنید');
    }
}

function setupPeerConnection() {
    peerConnection = new RTCPeerConnection(configuration);
    
    // اضافه کردن track های محلی
    localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStream);
    });

    // دریافت track های ریموت
    peerConnection.ontrack = event => {
        remoteVideo.srcObject = event.streams[0];
    };

    // مدیریت ICE candidate ها
    peerConnection.onicecandidate = event => {
        if (event.candidate) {
            socket.emit('ice-candidate', event.candidate, roomId);
        }
    };
}

async function createOffer() {
    try {
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        socket.emit('offer', offer, roomId);
        callButton.disabled = true;
        hangupButton.disabled = false;
    } catch (e) {
        console.error('خطا در ایجاد offer:', e);
    }
}

// Socket.io event handlers
socket.on('room_joined', (id) => {
    console.log('به اتاق پیوستید:', id);
});

socket.on('room_full', () => {
    alert('اتاق پر است!');
});

socket.on('offer', async (offer) => {
    try {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        socket.emit('answer', answer, roomId);
    } catch (e) {
        console.error('خطا در پردازش offer:', e);
    }
});

socket.on('answer', async (answer) => {
    try {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
    } catch (e) {
        console.error('خطا در پردازش answer:', e);
    }
});

socket.on('ice-candidate', async (candidate) => {
    try {
        await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (e) {
        console.error('خطا در افزودن ice candidate:', e);
    }
});

socket.on('user_disconnected', () => {
    hangup();
    alert('کاربر دیگر قطع شد');
});

function hangup() {
    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
    }
    
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
    }
    
    localVideo.srcObject = null;
    remoteVideo.srcObject = null;
    startButton.disabled = false;
    callButton.disabled = true;
    hangupButton.disabled = true;
    roomInput.disabled = true;
    joinButton.disabled = true;
}