/* eslint-disable no-underscore-dangle */

// source: https://github.com/lane-c-wagner/react-native-expo-cached-image
// Updated for modern Expo SDK API, aligned with official documentation

import React, { Component } from 'react';
import {
  Image,
  ImageStyle,
  ImageURISource,
  InteractionManager,
  StyleProp,
} from 'react-native';
import * as Crypto from 'expo-crypto';
import * as FileSystem from 'expo-file-system'; // <-- CORRECTED: Use namespace import
import ImageView from 'react-native-image-viewing';

import { getFormat } from '../helpers';

type Interaction = {
  cancel: () => void;
};

type Props = {
  source: Omit<ImageURISource, 'uri'> & { uri: string };
  isBackground?: boolean;
  style: StyleProp<ImageStyle>;
  visible?: boolean;
  setVisible?: () => void;
  sizeStyle?: { width?: number; height: number };
};

type State = {
  imgURI: string | null;
};

export default class CachedImage extends Component<Props, State> {
  mounted = true;
  _interaction: Interaction | null = null;
  // CORRECTED: Use the FileSystem namespace for types
  downloadResumable: FileSystem.DownloadResumable | null = null;
  state: State = { imgURI: null };

  async componentDidMount() {
    this._interaction = InteractionManager.runAfterInteractions(async () => {
      if (this.props.source.uri) {
        const filesystemURI = await this.getImageFilesystemKey(
          this.props.source.uri,
        );
        await this.loadImage(filesystemURI, this.props.source.uri);
      }
    });
  }

  async componentDidUpdate() {
    if (this.props.source.uri) {
      const filesystemURI = await this.getImageFilesystemKey(
        this.props.source.uri,
      );
      if (
        this.props.source.uri === this.state.imgURI ||
        filesystemURI === this.state.imgURI
      ) {
        return;
      }
      await this.loadImage(filesystemURI, this.props.source.uri);
    }
  }

  componentWillUnmount() {
    this._interaction?.cancel();
    this.mounted = false;
    this.checkClear();
  }

  async checkClear() {
    try {
      if (this.downloadResumable) {
        await this.downloadResumable.cancelAsync();
      }
    } catch (error) {
      // Suppress errors during cleanup
    }
  }

  async getImageFilesystemKey(remoteURI: string) {
    const hashed = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      remoteURI,
    );
    // CORRECTED: Use the FileSystem namespace for constants
    return `${FileSystem.documentDirectory}${hashed}.${getFormat(remoteURI)}`;
  }

  async loadImage(filesystemURI: string, remoteURI: string) {
    try {
      const metadata = await FileSystem.getInfoAsync(filesystemURI);
      if (metadata.exists && this.mounted) {
        this.setState({
          imgURI: filesystemURI,
        });
        return;
      }

      this.downloadResumable = FileSystem.createDownloadResumable(
        remoteURI,
        filesystemURI,
        {},
        (dp) => this.onDownloadUpdate(dp),
      );

      const imageObject = await this.downloadResumable.downloadAsync();
      if (this.mounted && imageObject?.status === 200) {
        this.setState({
          imgURI: imageObject.uri,
        });
      }
    } catch (err) {
      if (this.mounted) {
        this.setState({ imgURI: null });
      }
      try {
        const metadata = await FileSystem.getInfoAsync(filesystemURI);
        if (metadata.exists) {
          await FileSystem.deleteAsync(filesystemURI);
        }
      } catch (e) {
        // Suppress nested errors
      }
    }
  }

  // CORRECTED: Use the FileSystem namespace for types
  onDownloadUpdate(downloadProgress: FileSystem.DownloadProgressData) {
    if (
      downloadProgress.totalBytesWritten >=
      downloadProgress.totalBytesExpectedToWrite
    ) {
      this.downloadResumable = null;
    }
  }

  render() {
    const source = this.state.imgURI
      ? { uri: this.state.imgURI }
      : this.props.source;

    if (
      this.props.isBackground &&
      typeof this.props.visible === 'boolean' &&
      this.props.setVisible
    ) {
      return (
        <ImageView
          images={[{ uri: source?.uri }]}
          imageIndex={0}
          visible={this.props.visible}
          onRequestClose={this.props.setVisible}
          animationType="fade"
        />
      );
    } else {
      return <Image {...this.props} source={source} />;
    }
  }
}