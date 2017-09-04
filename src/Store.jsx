import React, {Component} from 'react';
import {BungieAuthorizationService, BungieRequestService, ItemService, store} from './services';

const vault = {
  characterLevel: '',
  characterBase: {
    classHash: 'vault',
    raceHash: 'full',
    powerLevel: ''
  },
  id: 4567
};

let inventoryPollingInterval, inventoryPollingDelay;

function calculateVaultColumns(characters, gridWidth) {
  return Math.floor((gridWidth - 90 - (271 * characters.filter((store) => {
    return store.key !== 'vault';
  }).length)) / 52);
}

function removeSplash() {
  const splash = document.getElementById("splash");
  splash.className = "removed";
  setTimeout(() => {
    splash.parentNode.removeChild(splash);
  }, 400);
}

function flattenBuckets(buckets) {
  return Object.keys(buckets).map((bucketKey) => {
    return Object.keys(buckets[bucketKey].items).map((characterID) => {
      return buckets[bucketKey].items[characterID];
    }).reduce((a, b) => {
      return a.concat((Array.isArray(b)
        ? b
        : []));
    }).map((item) => {
      return [item.itemId, item];
    }).reduce((o, [key, val]) => {
      o[key] = val;
      return o;
    }, {});
  }).reduce((a, b) => {
    return Object.assign(a, b);
  }, {})
}

function createCharactersByID(characters) {
  return characters.map((character) => {
    return [character.characterBase.characterId, Object.assign(character, {characterId: character.characterBase.characterId})];
  }).reduce((o, [key, val]) => {
    o[key] = val;
    return o;
  }, {});
}

class Store extends Component {
  constructor(props) {
    super(props);
    this.state = {
      bungieRequestService: false,
      authenticated: false,
      membership: {},
      characters: [],
      items: {},
      inventoryPolling: false,
      notifications: {},
      platform: 'xb1',
      vault,
      firebaseService: props.firebaseService,
      apiKey: props.apiKey,
      disablePolling: false,
      poller: {
        count: 0
      }
    }
  }

  onAuthorize = () => {
    return window.location.replace(`https://www.bungie.net/en/OAuth/Authorize?client_id=${this.state.apiKey.client_id}&response_type=code`);
  }

  authorize = () => {
    return BungieAuthorizationService(this.state.apiKey).then((authorization) => {
      return BungieRequestService(authorization, this.state.apiKey.key, this.state.destinyMembership.membershipType);
    });
  }

  componentDidMount() {
    return BungieAuthorizationService(this.state.apiKey).then((authorization) => {
      return BungieRequestService(authorization, this.state.apiKey.key).getMembershipById().then((membership) => {
        const destinyMembership = membership.destinyMemberships[0];
        const authenticated = true;
        const bungieRequestService = BungieRequestService(authorization, this.state.apiKey.key, destinyMembership.membershipType);
        this.state.firebaseService.insertOrUpdateUserAndTrackVisit(membership.bungieNetUser);

        this.setState({
          bungieRequestService,
          membership,
          destinyMembership,
          authenticated
        });
        this.updateWidth();
        window.addEventListener("resize", this.updateWidth);

        return ItemService(this.authorize).getCharacters(destinyMembership.membershipId).then((characters) => {
          removeSplash();

          const charactersByID = createCharactersByID(characters);
          this.state.firebaseService.insertOrUpdateCharacters(membership.bungieNetUser.membershipId, charactersByID);
          

          const vaultColumns = calculateVaultColumns(characters, this.state.clientWidth);
          
          this.setState({
            characters,
            charactersByID,
            vaultColumns
          });

          return this.updateItems();
        })
      })
    }).catch((error) => {
      removeSplash();      
      console.log(`Start Up Error: ${error.message}`);
    })
  }

  searchForItem = (event, query) => {
    this.setState({query});
  }

  startInventoryPolling = () => {
    if (!this.state.authenticated || this.state.inventoryPolling || this.state.disablePolling) return;
    
    if (inventoryPollingDelay) {
      clearTimeout(inventoryPollingDelay);
    }
    if (inventoryPollingInterval) {
      clearTimeout(inventoryPollingInterval);
    }
    const instance = Date.now();
    console.log('Start Poll', instance);
    inventoryPollingDelay = setTimeout(() => {
      this.inventoryPoll(0, instance);
    }, 15000);

    this.setState({
      inventoryPolling: true
    });
  }

  inventoryPoll = (count, instance) => {
    console.log('Poll', count, instance)            
    if (!this.state.inventoryPolling) return;
    const basePollingInterval = 15000;
    const ppm = 60000 / basePollingInterval;
    const pollDelay = count > (ppm * 5) ? (count / (ppm * 5)) * basePollingInterval : basePollingInterval;
    
    inventoryPollingInterval = setTimeout(() => {
      if (!this.state.authenticated) return;
      this.state.firebaseService.trackPollEventByBungieID(this.state.membership.bungieNetUser.membershipId, {count});      
      return Promise.all([
        this.updateItems(),
        this.updateCharacters()
      ]).then(() => {
        if (!this.state.inventoryPolling) return;
        console.log('Poll Data', count, instance)        
        return this.inventoryPoll(count + 1, instance);
      })
      .catch((error) => {
        console.log(`Polling Error: ${error.message}`);
      });
    }, pollDelay);
  }

  updateItems = () => {
    return ItemService(this.authorize).getItems(this.state.clientWidth, this.state.characters).then((items) => {
      this.state.firebaseService.insertOrUpdateItems(this.state.membership.bungieNetUser.membershipId, flattenBuckets(items));
      this.setState({items})}
    );
  }

  stopInventoryPolling = () => {
    console.log('Stop Polling')
    clearTimeout(inventoryPollingInterval);
    clearTimeout(inventoryPollingDelay);

    this.setState({
      inventoryPolling: false
    });
  }

  getItemDetail = (characterID, itemInstanceID) => {
    const {membershipId} = this.state.destinyMembership;
    return ItemService(this.authorize).getItemDetail(membershipId, characterID, itemInstanceID);
  }

  createTransferPromise = (itemReferenceHash, itemId, lastCharacterID, initialCharacterID, shouldEquip, shouldUnequipReplacementItemID) => {
    const toVault = lastCharacterID === 'vault';
    const fromVault = initialCharacterID === 'vault';
    this.state.firebaseService.trackTransferByBungieID(this.state.membership.bungieNetUser.membershipId, {itemID: itemId, lastCharacterID, initialCharacterID, shouldEquip, shouldUnequipReplacementItemID : shouldUnequipReplacementItemID ? shouldUnequipReplacementItemID : false});

    if (shouldEquip && lastCharacterID === initialCharacterID) {
      return ItemService(this.authorize).equipItem(itemId, lastCharacterID);
    }

    if (shouldUnequipReplacementItemID && lastCharacterID === initialCharacterID) {
      return ItemService(this.authorize).equipItem(shouldUnequipReplacementItemID, lastCharacterID);
    }

    const isSpecificVaultTransaction = toVault || fromVault;
    const characterID = isSpecificVaultTransaction
      ? (toVault ? initialCharacterID : lastCharacterID)
      : initialCharacterID;
    const isVaultTransaction = isSpecificVaultTransaction
      ? toVault
      : true;
      
    return ItemService(this.authorize).moveItem(itemReferenceHash, itemId, characterID, isVaultTransaction).then((result) => {
      return (fromVault && shouldEquip)
        ? ItemService(this.authorize).equipItem(itemId, lastCharacterID)
        : !isSpecificVaultTransaction
          ? ItemService(this.authorize).moveItem(itemReferenceHash, itemId, lastCharacterID).then((result) => {
            return shouldEquip ? ItemService(this.authorize).equipItem(itemId, lastCharacterID) : result;
          })
          : result;
    });
  }

  moveItem = (itemReferenceHash, itemId, lastCharacterID, initialCharacterID, shouldEquip, shouldUnequipReplacementItemID) => {
    return this.createTransferPromise(itemReferenceHash, itemId, lastCharacterID, initialCharacterID, shouldEquip, shouldUnequipReplacementItemID)
      .then(this.updateCharacters).then(this.addNotification('Success'))
      .catch((error) => {
        this.addNotification(error.message);
        throw new Error(error.message);
      });
  }

  addNotification = (message) => {
    const stamp = Date.now();
    this.setState({
      notifications: Object.assign({}, this.state.notifications, {
        [stamp]: {message, timestamp: Date.now()}
      })
    });
    
    setImmediate(() => {
      this.setState({
        notifications: Object.assign({}, this.state.notifications, {
          [stamp]: Object.assign(this.state.notifications[stamp], {
            rendered: true
          })
        })
      });
    })

    setTimeout(() => {
      this.setState({
        notifications: Object.assign({}, this.state.notifications, {
          [stamp]: Object.assign(this.state.notifications[stamp], {
            rendered: false
          })
        })
      })
    }, 3000);

    return Promise.resolve();
  }

  updateCharacters = () => {
    return ItemService(this.authorize).getCharacters(this.state.destinyMembership.membershipId).then((characters) => {
      const characterBaseByID = characters.map((character) => {
        return [character.characterBase.characterId, character.characterBase]
      }).reduce((o, [key, val]) => {
        o[key] = val;
        return o;
      }, {});

      const newCharacters = this.state.characters.map((character) => {
        return Object.assign(character, {characterBase: characterBaseByID[character.characterId]});
      });

      this.setState({
        characters: newCharacters,
        charactersByID: createCharactersByID(newCharacters)
      });
    });
  }

  updateWidth = () => {
    this.setState({
      clientWidth: this.refs.client.clientWidth,
      clientXY: [this.refs.client.clientWidth, window.innerHeight],
      vaultColumns: calculateVaultColumns(this.state.characters, this.refs.client.clientWidth)
    });
  }

  componentWillUnmount = () => {
    window.removeEventListener("resize", () => this.updateWidth());
  }

  onReload = () => {
    this.setState({reloading: true})
    return ItemService(this.authorize).getItems(this.state.clientWidth, this.state.characters)
      .then((characterItems) => {
        this.setState({
          items: characterItems,
          reloading: false
        });
      });
  }

  onLogout = () => {
    return store.delete('Vault::Authorization').then(() => {
      this.setState({
        authenticated: false,
        characters: undefined,
        items: undefined,
        itemService: undefined,
        bungieRequestService: undefined
      });
    });
  }

  render() {
    return (
      <div ref='client'>
        {this.props.children({props: this.state, actions: this})}
      </div>
    );
  }
}

export default Store;