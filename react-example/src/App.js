import React from 'react';
import logo from './logo.svg';
import * as api from './api';
import './App.css';

export default class App extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      name: "[waiting for server]",
      news: "No latest news yet!",
      companyId: null
    };
  }

  buy = async () => {
    if (this.state.companyId) {
      try {
        const id = await api.placeImmediateBuyOrder(this.state.companyId, 1);
        alert("We bought a new share with id: " + id);
      } catch (e) {
        alert(e.message);
      }
    } else {
      alert(
        "Please wait for the first server response. (Did you fill in your credentials?)"
      );
    }
  }

  handleGameUpdate = (game) => {
    // For now we want to extract the companyId and player name
    this.setState(state => ({
      name: game.player.name,
      companyId: game.companies.find(c => c.key === "ing").id
    }));
  }

  // This method is called once when the component is started
  componentDidMount = () => {
    // Subscribe to game updates
    this.querySubscription = api.activeGameSubscription().subscribe({
      next: ({ data }) => {
        // Handle the game update
        this.handleGameUpdate(data.activeGame);
      },
      error: e => {
        console.error(e);
      }
    });

    // Also subscribe to news updates
    this.newsSubscription = api.newsSubscription().subscribe({
      next: ({ data }) => {
        // Show the news
        console.log(data);
        this.setState(state => ({
          news: data.news.headline,
        }));
      },
      error: e => {
        console.error(e);
      }
    });
  }

  // This method is called once when the component is destroyed
  componentWillUnmount = () => {

    // Always unsubscribe, to prevent hot-reloading bugs
    this.querySubscription.unsubscribe();
    this.newsSubscription.unsubscribe();
  }

  render() {
    return (
      <div className="App">
        <header className="App-header">
          <img src={logo} className="App-logo" alt="logo" />
          <h1>Have fun @ Coding MADness!</h1>
          <p>Welcome: {this.state.name}!</p>
          <button onClick={this.buy}>Buy 1 share of ING</button>
          <h2>Latest news:</h2>
          <p>{this.state.news}</p>
        </header>
      </div>
    );
  }
}
