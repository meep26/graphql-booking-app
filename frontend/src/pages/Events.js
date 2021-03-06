import React, { Component } from 'react';
import axios from 'axios';

import './Event.css';

import AuthContext from '../context/auth-context';

import Modal from '../components/Modal/Modal';
import Backdrop from '../components/Backdrop/Backdrop';

import EventForm from '../components/Events/EventForm';
import EventList from '../components/Events/EventList';
import EventDetail from '../components/Events/EventDetail';

class Events extends Component {
   state = {
      creating: false,
      isLoading: false,
      events: [],
      selectedEvent: null,
      title: '',
      price: '',
      date: '',
      description: ''
   };

   componentDidMount() {
      this.fetchEvents();
   }

   static contextType = AuthContext;

   async fetchEvents() {
      try {
         this.setState({ isLoading: true });
         const reqQuery = {
            query: `
               query {
                  events {
                     _id
                     title
                     description
                     price
                     date
                     creator {
                        _id
                     }
                  }
               }
            `
         };
   
         const res = await axios.post('http://localhost:8000/graphql', reqQuery);
   
         this.setState({
            events: res.data.data.events,
            isLoading: false
         });
      }
      catch (error) {
         console.log(error);
         this.setState({ isLoading: false });
      }
   }

   onCreateHandler = () => this.setState({ creating: true });

   onCancelHandler = () => this.setState({ creating: false, selectedEvent: null });

   onChange = e => this.setState({ [e.target.name]: e.target.value });

   onSubmit = async e => {
      e.preventDefault();
      
      const eventData = {
         title: this.state.title,
         price: +this.state.price,
         date: this.state.date,
         description: this.state.description
      }

      const { title, price, date, description } = eventData;
      const token = this.context.token;
      
      const reqQuery = {
         query: `
            mutation CreateEvent($title: String!, $desc: String!, $price: Float!, $date: String!) {
               createEvent(eventInput: { title: $title, description: $desc, price: $price, date: $date }) {
                  _id
                  title
                  description
                  price
                  date
               }
            }
         `,
         variables: {title, desc: description, price, date }
      };

      const res = await axios.post('http://localhost:8000/graphql', reqQuery, {
         headers: { Authorization: "Bearer " + token }
      });

      this.setState(prevState => {
         const updatedEvents = [...prevState.events];
         const { _id, title, description, price, date } = res.data.data.createEvent;
         updatedEvents.push({
            _id: _id,
            title: title,
            description: description,
            price: price,
            date: date,
            creator: {
               _id: this.context.userId
            }
         });

         return { events: updatedEvents };
      });

      this.setState({
         creating: false,
         title: '',
         price: '',
         date: '',
         description: ''
      });
      
   };

   onShowDetail = eventId => {
      this.setState(prevState => {
         const selectedEvent = prevState.events.find(e => e._id === eventId);

         return { selectedEvent };
      });
   };

   onBookEvent = async e => {
      e.preventDefault();
      const eventId = this.state.selectedEvent._id;

      const reqQuery = {
         query: `
            mutation BookEvent($id: ID!) {
               bookEvent(eventId: $id) {
                  event {
                     title
                  }
                  createdAt
                  updatedAt
               }
            }
         `,
         variables: { id: eventId }
      };

      try {
         await axios.post('http://localhost:8000/graphql', reqQuery, {
            headers: { Authorization: "Bearer " + this.context.token }
         });
         
         this.onCancelHandler();
      }
      catch (error) {
         console.log(error);
      }

   };

   render() {
      const { creating, isLoading, title, price, date, description, events, selectedEvent } = this.state;
      const eventData = { title, price, date, description };

      return (
         <React.Fragment>
            {
               ( creating ) && (
                  <React.Fragment>
                     <Backdrop onCancel={this.onCancelHandler} />
                     <Modal
                        title="Add Event"
                        onCancel={this.onCancelHandler}
                     >
                        <EventForm
                           eventData={eventData}
                           onChange={this.onChange}
                           onSubmit={this.onSubmit}
                        />
                     </Modal>
                  </React.Fragment>
               )
            }
            {
               this.context.token &&
                  <div className="events-control">
                     <p>Share your own events!</p>
                     <button className="btn" onClick={this.onCreateHandler}>Create event</button>
                  </div>
            }
            {
               selectedEvent &&
                  <React.Fragment>
                     <Backdrop onCancel={this.onCancelHandler} />
                     <Modal
                        title="Book Event"
                        onCancel={this.onCancelHandler}
                     >
                        <EventDetail
                           event={selectedEvent}
                           onBookEvent={this.onBookEvent}
                           token={this.context.token}
                           onClose={this.onCancelHandler}
                        />
                     </Modal>
                  </React.Fragment>
            }
            {
               isLoading
                  ? <span>Loading...</span>
                  : events.length > 0
                     ? <EventList
                        events={events}
                        authUserId={this.context.userId}
                        onViewDetail={this.onShowDetail}
                     />
                     : <span>No events yet.</span>
            }
            
         </React.Fragment>
      )
   }
}

export default Events;