const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const port = process.env.PORT || 3000;

app.use(express.static('public'));

// نگهداری اطلاعات اتصال‌های فعال
const connections = new Map();

io.on('connection', (socket) => {
    console.log('کاربر جدید متصل شد:', socket.id);

    // وقتی کاربر جدید وارد می‌شود
    socket.on('join', (roomId) => {
        const room = io.sockets.adapter.rooms.get(roomId) || { size: 0 };
        if (room.size < 2) {
            socket.join(roomId);
            connections.set(socket.id, roomId);
            socket.emit('room_joined', roomId);
            
            if (room.size === 1) {
                socket.to(roomId).emit('user_connected');
            }
        } else {
            socket.emit('room_full');
        }
    });

    // انتقال سیگنال‌های WebRTC
    socket.on('offer', (offer, roomId) => {
        socket.to(roomId).emit('offer', offer);
    });

    socket.on('answer', (answer, roomId) => {
        socket.to(roomId).emit('answer', answer);
    });

    socket.on('ice-candidate', (candidate, roomId) => {
        socket.to(roomId).emit('ice-candidate', candidate);
    });

    // مدیریت قطع اتصال
    socket.on('disconnect', () => {
        const roomId = connections.get(socket.id);
        if (roomId) {
            socket.to(roomId).emit('user_disconnected');
            connections.delete(socket.id);
        }
    });
});

http.listen(port, () => {
    console.log(`سرور روی پورت ${port} در حال اجراست`);
});