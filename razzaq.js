import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import { IoPersonCircle, IoEyeSharp } from 'react-icons/io5';
import { FaUser, FaTimes } from 'react-icons/fa';
import Popup from './Popup';
import Modal from 'react-bootstrap/Modal';
import BottomWidget from './BottomWidget';

function Visitors() {
  const [show, setShow] = useState(false);
  const [visitorData, setVisitorData] = useState([]);
  const [popupData, setPopupData] = useState(null);

  const handleClose = () => setShow(false);

  const handleShow = (room_id) => {
  // Fetch data from the Node.js server based on room_id
  fetch(`http://localhost:3001/api/messages/${room_id}`)
    .then((response) => response.json())
    .then((data) => {
      setPopupData(data);
      setShow(true);
    })
    .catch((error) => console.error('Error fetching data:', error));
};

   useEffect(() => {
    // Fetch data from the Node.js server
    fetch('http://localhost:3001/api/customers')
      .then((response) => response.json())
      .then((data) => setVisitorData(data))
      .catch((error) => console.error('Error fetching data:', error));
  }, []);


  return (
    <>
      <div className="th-body-sec">
        <div className="th-z-menu">
          <Sidebar />
        </div>
        <div className="th-content-sec">
          <div className="th-body-content">
            <div className="row th-visit-header">
                            <div className="col-6 pad-5">
                                <h1>Visitors</h1>
                            </div>
                            <div className="col-6 pad-5"> 
                            <div className="peron-icon"><IoPersonCircle /></div>
                            </div>
                        </div>
                        <div className="row th-incoming-chat">
                            <div className="col-6 pad-5">
                                <h5>Incoming chats</h5>
                            </div>
                            <div className="col-6 pad-5"> 
                            <div className="visit-count"><h6>Visitors:1</h6></div>
                            </div>
                        </div>
                        <div className="row th-visitr-label">
                            <div className="col-lg-2 col-md-3 col-sm-3 col-3 pad-5">
                                <label>Visitor</label>
                            </div>  
                            <div className="col-lg-1 col-2">
                            <label>Online</label>
                            </div> 
                            <div className="col-lg-5 col-md-3 col-sm-3 col-3 pad-5">
                            <label>Viewing</label>
                            </div> 
                            <div className="col-2 pad-5">
                            <label>Referrer</label>
                            </div>
                            <div className="col-1 pad-5">
                            <label>Visits</label>
                            </div> 
                            <div className="col-1 pad-5">
                            <label>Chats</label>
                            </div> 
                        </div>


            {visitorData.map((visitor, index) => (
            <div className="row th-visitr-detail" onClick={() =>  handleShow(visitor.room)}>
                <div key={index} className="col-lg-2 col-md-3 col-sm-3 col-3 pad-5">
                  <label>
                    <span className="eye-show">
                      <IoEyeSharp />
                    </span>
                    #{visitor.room}
                    <span className="flags">
                    <img src={process.env.PUBLIC_URL + "images/pak-flag.svg"} alt="pak" />  
                    <img src={process.env.PUBLIC_URL + "images/window.svg"} alt="pak" />
                    <img src={process.env.PUBLIC_URL + "images/chrome.svg"} alt="pak" />
                    </span>
                  </label>
                </div>
                <div className="col-lg-1 col-2 pad-5">
                <label>23 mins</label>
                </div>
                <div className="col-lg-5 col-md-3 col-sm-3 col-3 pad-5">
                <label>Simulate Visitor on Zendesk Chat</label>
                </div> 
                <div className="col-2 pad-5">
                <label>ybycrm.zendesk.com</label>
                </div>
                <div className="col-1 pad-5">
                <label>5</label>
                </div> 
                <div className="col-1 pad-5">
                <label>5</label>
                </div>
            </div>
            ))}

          </div>
        </div>
      </div>
      <div className="th-chat-widget-sec">
        <BottomWidget />
      </div>
      <Modal show={show} onHide={handleClose}>
        <Popup data={popupData} func={handleClose} />
      </Modal>
    </>
  );
}

export default Visitors;
