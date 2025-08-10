// src/pages/HomePage.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api';
import io from 'socket.io-client';
import Peer from 'simple-peer';
import { jwtDecode } from 'jwt-decode';

const socket = io('https://saurav-call-app-backend.onrender.com');

function HomePage() {
  const [contacts, setContacts] = useState([]);
  const [stream, setStream] = useState(null);
  const [myShareId, setMyShareId] = useState('');
  const [addContactShareId, setAddContactShareId] = useState('');
  const [onlineUsers, setOnlineUsers] = useState([]);
  
  // Consolidated call state for better management
  const [call, setCall] = useState({
    isReceivingCall: false,
    caller: "",
    callerSignal: null,
    callAccepted: false,
    callType: '',
    otherUser: null
  });

  const myVideo = useRef();
  const userVideo = useRef();
  const connectionRef = useRef();
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
        try {
            const decoded = jwtDecode(token);
            socket.emit('addUser', decoded.user.id);
            setMyShareId(decoded.user.shareId);
        } catch (error) {
            console.error("Invalid token:", error);
            handleLogout();
        }
    }
    
    socket.on('getUsers', (users) => setOnlineUsers(users));

    socket.on("call-incoming", (data) => {
        setCall({
            ...call,
            isReceivingCall: true,
            caller: data.from,
            callerSignal: data.signal,
            callType: data.callType
        });
    });

    socket.on("call-ended", () => {
        leaveCall(false); // false means we are receiving the hangup
    });
    
    fetchContacts();

    return () => {
        socket.off("getUsers");
        socket.off("call-incoming");
        socket.off("call-ended");
    };
  }, []);

  const fetchContacts = async () => {
    try {
      const response = await api.get('/contacts');
      setContacts(response.data);
    } catch (error) {
      console.error('Failed to fetch contacts:', error);
    }
  };

  const handleAddContact = async (e) => {
    e.preventDefault();
    if (!addContactShareId) return;
    try {
      await api.post('/contacts/add', { shareId: addContactShareId });
      setAddContactShareId('');
      fetchContacts();
      alert('Contact added!');
    } catch (error) {
      alert(error.response.data.msg || 'Failed to add contact');
    }
  };

  const startMedia = async (callType) => {
    try {
      const currentStream = await navigator.mediaDevices.getUserMedia({
        video: callType === 'video',
        audio: true,
      });
      setStream(currentStream);
      if (myVideo.current) {
        myVideo.current.srcObject = currentStream;
      }
      return currentStream;
    } catch (error) {
      console.error("Error accessing media devices.", error);
      alert("Could not get camera/microphone permission. Please check your device settings.");
    }
  };

  const callUser = async (idToCall, type) => {
    const currentStream = await startMedia(type);
    if (!currentStream) return;

    const peer = new Peer({
      initiator: true,
      trickle: false,
      stream: currentStream,
      config: { iceServers: [{ urls: 'stun:stun.l.google.com:1932' }, { urls: 'stun:stun1.l.google.com:19302' }] },
    });

    peer.on("signal", (data) => {
      const token = localStorage.getItem('token');
      const decoded = jwtDecode(token);
      socket.emit("call-user", { to: idToCall, from: decoded.user.id, signalData: data, callType: type });
    });

    peer.on("stream", (remoteStream) => {
      if (userVideo.current) {
        userVideo.current.srcObject = remoteStream;
      }
    });

    socket.on("call-accepted", (signal) => {
      setCall(prev => ({ ...prev, callAccepted: true, otherUser: idToCall }));
      peer.signal(signal);
    });

    connectionRef.current = peer;
  };

  const answerCall = async () => {
    const currentStream = await startMedia(call.callType);
    if (!currentStream) return;

    setCall(prev => ({ ...prev, callAccepted: true, isReceivingCall: false, otherUser: call.caller }));

    const peer = new Peer({
      initiator: false,
      trickle: false,
      stream: currentStream,
      config: { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }] },
    });

    peer.on("signal", (data) => {
      socket.emit("answer-call", { signal: data, to: call.caller });
    });

    peer.on("stream", (remoteStream) => {
      userVideo.current.srcObject = remoteStream;
    });

    peer.signal(call.callerSignal);
    connectionRef.current = peer;
  };

  const leaveCall = (isInitiator = true) => {
    if (isInitiator) {
      socket.emit('hang-up', { to: call.otherUser });
    }
    if (connectionRef.current) {
      connectionRef.current.destroy();
    }
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    setStream(null);
    setCall({
      isReceivingCall: false,
      caller: "",
      callerSignal: null,
      callAccepted: false,
      callType: '',
      otherUser: null
    });
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    socket.disconnect();
    navigate('/login');
    window.location.reload();
  };
  
  const copyShareId = () => {
    navigator.clipboard.writeText(myShareId);
    alert('Share ID copied to clipboard!');
  };

  return (
    <div className="homepage-container">
      <header className="homepage-header">
        <h1>My Contacts</h1>
        <button onClick={handleLogout} className="logout-button">Logout</button>
      </header>
      
      <div className="share-id-container" onClick={copyShareId} title="Click to copy">
        <p>Your Share ID:</p>
        <strong>{myShareId}</strong>
      </div>

      <div className="add-contact-form">
        <form onSubmit={handleAddContact}>
          <input type="text" placeholder="Enter Share ID to add contact" value={addContactShareId} onChange={(e) => setAddContactShareId(e.target.value)} />
          <button type="submit">Add Contact</button>
        </form>
      </div>

      <div className="video-container">
          <div className="video">
              {stream && <video playsInline muted ref={myVideo} autoPlay style={{ width: "300px" }} />}
          </div>
          <div className="video">
              {call.callAccepted ?
              <video playsInline ref={userVideo} autoPlay style={{ width: "300px" }} /> :
              null}
          </div>
      </div>

      <div className="contact-list">
        {contacts.map((contact) => {
          const isOnline = onlineUsers.some(user => user.userId === contact._id);
          return (
            <div key={contact._id} className="contact-item">
              <div className="contact-info">
                <span className={`status-indicator ${isOnline ? 'online' : 'offline'}`}></span>
                <p>{contact.username}</p>
              </div>
              {call.callAccepted ? (
                call.otherUser === contact._id && <button className="hangup-button" onClick={() => leaveCall(true)}>Hang Up</button>
              ) : (
                <div className="call-buttons">
                  <button className="call-button" onClick={() => callUser(contact._id, 'video')}>Video Call</button>
                  <button className="call-button" onClick={() => callUser(contact._id, 'voice')}>Voice Call</button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {call.isReceivingCall && !call.callAccepted ? (
        <div className="call-notification">
          <h1>Incoming {call.callType} call...</h1>
          <button onClick={answerCall}>Answer</button>
        </div>
      ) : null}
    </div>
  );
}

export default HomePage;