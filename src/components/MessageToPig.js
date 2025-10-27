import React from 'react';
import './MessageToPig.css';

function MessageToPig({ onGoBack }) {
  return (
    <div className="message-to-pig-container">
      <div className="message-header">
        <button className="back-button" onClick={onGoBack}>← 返回</button>
        <h1 className="message-title">想对猪说的话</h1>
      </div>
      
      <div className="message-content">
        <div className="birthday-message">
          <h2>祝你生日快乐！</h2>
          <p>感谢很多年在一起的陪伴！</p>
          <p>越来越离不开你！</p>
          <p>今后的路也要永远一起在一起！</p>
        </div>
        
        <div className="image-container">
          <img src={process.env.PUBLIC_URL + '/cc_oscar.jpg'} alt="CC and Oscar" className="cc-oscar-image" />
        </div>
      </div>
    </div>
  );
}

export default MessageToPig;