import React from 'react';
import Head from 'next/head';
import Navbar from '../components/Navbar';
import TextInput from '../components/TextInput';
import Wishes from '../components/Wishes';
import axios from 'axios';

// Flipper for local lambda development
import global from '../global';
const { DEV } = global;

// Getting some weird circular JSON when fetching api/node/wishes
// Using this as a workaround for axios
// https://github.com/axios/axios/issues/836
const handle_axios_error = function(err) {
  if (err.response) {
    const custom_error = new Error(
      err.response.statusText || 'Internal server error'
    );
    custom_error.status = err.response.status || 500;
    custom_error.description = err.response.data
      ? err.response.data.message
      : null;
    throw custom_error;
  }
  throw new Error(err);
};
axios.interceptors.response.use(r => r, handle_axios_error);

export default class IndexPage extends React.Component {
  // Not SSR wish items due to some issue with fetching SSR
  // static async getInitialProps({ req }) {
  //   try {
  //     console.log('Get initial wishlists');
  //     const { data } = await axios.get(
  //       // Using ternary because NextJS is not shortcuiting DEV && 'http://localhost:8004/' properly
  //       `${DEV ? 'http://localhost:8004/' : ''}api/node/wishes`
  //     );
  //     console.log('Initial wishlist data', data);
  //     if (data && data.Items && data.Items.length) {
  //       return {
  //         wishers: [...data.Items]
  //       };
  //     }
  //   } catch (error) {
  //     return { error };
  //   }
  // }

  constructor(props) {
    super(props);
    this.state = {
      error: false,
      name: '',
      loading: false,
      wishers: props.wishers || []
    };
  }

  // Move fetch from getInitialProps since that static method doesn't seem to run. It seems to be
  // failing on line 33, the axios call
  async componentDidMount() {
    try {
      console.log('Get initial wishlists');
      const { data } = await axios.get(
        // Using ternary because NextJS is not shortcuiting DEV && 'http://localhost:8004/' properly
        `${DEV ? 'http://localhost:8004/' : ''}api/node/wishes`
      );
      console.log('Initial wishlist data', data);
      if (data && data.Items && data.Items.length) {
        this.setState({ wishers: [...data.Items] });
      }
    } catch (error) {
      this.setState({ error: true });
    }
  }

  // Handles the main text input
  handleChange = e => {
    const { name, type, value } = e.target;
    const val = type === 'number' ? parseFloat(value) : value;
    this.setState({ [name]: val, error: false });
  };

  // Necessary to trigger on Enter key press
  handleKeyPress = e => {
    const { type, value } = e.target;
    const val = type === 'number' ? parseFloat(value) : value;
    if (val && e.key === 'Enter') {
      this.createWisher(val);
    }
  };

  handleWishClick = e => {
    if (!this.state.name) return;
    this.createWisher(this.state.name);
  };

  async createWisher(name) {
    this.setState({ loading: true, error: false });
    try {
      const res = await axios.post(
        `${DEV ? 'http://localhost:8004/' : ''}api/node/wish`,
        {
          name,
          wishes: []
        }
      );

      let user_id = res.data.user_id;
      this.setState({
        loading: false,
        name: '',
        wishers: [...this.state.wishers, this._formatWisher({ name, user_id })]
      });
    } catch (e) {
      console.error('post fail', e);
      this.setState({
        loading: false,
        name: '',
        error: true,
        wishers: [...this.state.wishers, this._formatWisher({ name })]
      });
    }
  }

  deleteWisher = async id => {
    try {
      await axios.delete(
        `${DEV ? 'http://localhost:8004/' : ''}api/node/wish/delete`,
        {
          data: {
            user_id: id
          }
        }
      );
      const wishers = this.state.wishers.filter(
        wisher => wisher.user_id !== id
      );
      this.setState({ wishers });
    } catch (e) {
      console.error(e);
      this.setState({ error: true });
    }
  };

  // Formats the wish into compatible format
  _formatWisher({ name, user_id = '' }) {
    return {
      time_stamp: Date.now(),
      user_id,
      name,
      wishlist: []
    };
  }

  render() {
    return (
      <main className="main">
        <Head>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
        </Head>
        <div className="main-content">
          <Navbar />
          <h1 className="title is-2" style={{ textAlign: 'center' }}>
            Fail Tracker
          </h1>
          <div className="main-input">
            <TextInput
              handleChange={e => this.handleChange(e)}
              handleWishClick={e => this.handleWishClick(e)}
              handleKeyPress={e => this.handleKeyPress(e)}
              text={this.state.name}
              loading={this.state.loading}
            />
          </div>
          {this.state.error && (
            <div className="notification is-danger">
              <button
                className="delete"
                onClick={() => this.setState({ error: false })}
              />
              Sorry, something's wrong on our end! Your change was not saved.
            </div>
          )}
          {this.state.wishers && (
            <Wishes
              wishers={this.state.wishers}
              deleteWisher={this.deleteWisher}
            />
          )}
        </div>
        <style jsx>{`
          .main {
            max-width: 1000px;
            margin: 0 auto;
            padding: 24px;
          }

          .main-input {
            max-width: 500px;
            margin: 0 auto;
            margin-bottom: 24px;
          }

          .main-content {
            margin: 0 auto;
          }
        `}</style>
      </main>
    );
  }
}
