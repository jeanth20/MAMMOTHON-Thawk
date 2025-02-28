// const pb = new PocketBase('http://127.0.0.1:8090');
const pb = new PocketBase('https://thawk.xyz/pocketbase');

const token = localStorage.getItem('authToken');

pb.authStore.save(token);

let globalName, globalId, globalAvatar, globalCreated, globalEmail, globalRoom;
let sockets = {};

async function getUserDetails(maxRetries = 3, delay = 1000) {
  let retries = 0;
  while (retries < maxRetries) {
    try {
      const user = await pb.collection('users').authRefresh();
      if (user.record) {
        globalName = user.record.name;
        globalId = user.record.id;
        globalEmail = user.record.email;
        globalAddress = user.record.email.split('@')[0];
        globalAvatar = user.record.avatar;
        globalCreated = user.record.created;
        document.getElementById('username-Update').value = globalName || '';
        document.getElementById('address-Update').value = globalAddress || '';
        // console.log('User details fetched:', { name: globalName, id: globalId, globalAddress, avatar: globalAvatar, created: globalCreated });
        return { name: globalName, id: globalId, address: globalAddress, avatar: globalAvatar, created: globalCreated };
      }
      console.error('No user record found.');
      return null;
    } catch (error) {
      if (error instanceof ClientResponseError && error.isAbort) {
        console.warn('Request was autocancelled, retrying...');
        retries++;
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        console.error('Error fetching user details:', error);
        return null;
      }
    }
  }
  console.error('Max retries reached. User details could not be fetched.');
  return null;
}
document.getElementById('profileModal').addEventListener('show.bs.modal', async () => {
  const userDetails = await getUserDetails();
  if (userDetails) {
    document.getElementById('username-Update').value = userDetails.name || '';
    document.getElementById('address-Update').value = userDetails.address || '';
  } else {
    console.error('Failed to fetch user details.');
  }
});

async function updateUserProfile() {

  const username = document.getElementById('username-Update').value.trim();
  const avatarFile = document.getElementById('avatar-Update').files[0];

  if (!username) {
    alert('Please enter a username.');
    return;
  }

  const data = {
    name: username,
  };

  if (avatarFile) {
    const formData = new FormData();
    formData.append('avatar', avatarFile);
    formData.append('name', username);

    try {
      const record = await pb.collection('users').update(globalId, formData, { $autoCancel: false });
      alert('Profile updated successfully!');
      updateUserDetails();
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Failed to update profile.');
    }
  } else {
    try {
      const record = await pb.collection('users').update(globalId, data);
      alert('Profile updated successfully!');
      updateUserDetails();
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Failed to update profile.');
    }
  }
}

document.querySelector('.btn-primary').addEventListener('click', updateUserProfile);

async function updateUserDetails() {
  const userDetails = await getUserDetails();
  // console.log('User details inside updateUserDetails:', userDetails);
  
  if (userDetails) {
    const userAvatarElement = document.getElementById('user-avatar');
    const userNameElement = document.getElementById('user-name');
    const userDetailsElement = document.getElementById('user-details');

  if (userAvatarElement && userNameElement && userDetailsElement) {
      const avatarUrl = userDetails.avatar ? `https://thawk.xyz/pocketbase/api/files/_pb_users_auth_/${userDetails.id}/${userDetails.avatar}` : 'https://img.freepik.com/free-vector/blue-circle-with-white-user_78370-4707.jpg';
      userAvatarElement.src = avatarUrl;
      userAvatarElement.alt = 'User Avatar';

      userNameElement.textContent = userDetails.name || 'No Name';

      if (userDetails.created) {
        const creationDate = new Date(userDetails.created).toLocaleDateString();
        userDetailsElement.textContent = `Joined on, ${creationDate}`;
      } else {
        userDetailsElement.textContent = 'No creation date available';
      }
    } else {
      console.error('One or more HTML elements not found.');
    }
  } else {
    console.error('User details could not be updated or are undefined.');
  }
}

function updateChatRoomName(roomName) {
  document.querySelector(".chat-area-title").textContent = roomName;
}

function clearChatArea() {
  const chatArea = document.querySelector(".chat-area-main");
  if (chatArea) {
      chatArea.innerHTML = "";
  }
}

function scrollDown() {
  const chatArea = document.querySelector('.chat-area-main');
  
  if (chatArea) {
    chatArea.scrollTo({
      top: chatArea.scrollHeight,
      behavior: 'smooth'
    });
  } else {
    console.error('Chat area not found');
  }
}

async function login() {
  const cosmosAddress = document.getElementById('cosmosAddressInput').value.trim();
  if (!cosmosAddress) {
    alert('Please enter your Cosmos address.');
    return;
  }

  try {
    const user = await pb.collection('users').authWithPassword(cosmosAddress, 'password'); // Assuming password is 'password'
    localStorage.setItem('authToken', user.token);
    alert('Logged in successfully!');
    updateUserDetails();
    handlefetchGroups();
  } catch (error) {
    console.error('Login failed:', error);
    alert('Login failed. Please check your Cosmos address.');
  }
}

function sendMessage() {
  const message = messageInput.value.trim();
  if (!message) return;

  if (!globalRoom || !sockets[globalRoom]) {
    console.warn("❌ No active WebSocket for the room.");
    return;
  }

  const roomSocket = sockets[globalRoom];

  if (roomSocket.readyState === WebSocket.OPEN) {
      const messageData = {
          userId: globalId,
          text: message + ' ~ ' + globalName,
          timestamp: new Date().toISOString(),
      };

      roomSocket.send(JSON.stringify(messageData));

      appendMessage({
          text: message,
          senderName: "You",
          timestamp: new Date().toLocaleTimeString(),
      }, true);

      messageInput.value = "";
  } else {
      console.warn("❌ WebSocket is not connected.");
  }
}

let chatArea;
document.addEventListener("DOMContentLoaded", () => {
  chatArea = document.querySelector(".chat-area-main");
  if (!chatArea) console.error("❌ chatArea not found on page load!");
});

function appendMessage(messageDetails, isMine) {
  const chatArea = document.querySelector(".chat-area-main");
  if (!chatArea) {
    console.error("❌ chatArea not found!");
    return;
  }

  const avatarUrl = messageDetails.avatar ? `https://thawk.xyz/pocketbase/api/files/_pb_users_auth_/${messageDetails.userId}/${messageDetails.avatar}` : 'https://img.freepik.com/free-vector/blue-circle-with-white-user_78370-4707.jpg';

  const messageElement = document.createElement("div");
  messageElement.classList.add("chat-msg");
  if (isMine) messageElement.classList.add("owner");

  messageElement.innerHTML = `
      <div class="chat-msg-profile">
          <img class="chat-msg-img" src="${avatarUrl}" alt="User Avatar" />
          <div class="chat-msg-date">${messageDetails.timestamp}</div>
      </div>
      <div class="chat-msg-content">
          <div class="chat-msg-text">${messageDetails.text}</div>
      </div>
  `;

  chatArea.appendChild(messageElement);
  chatArea.scrollTop = chatArea.scrollHeight;
  scrollDown();
}

async function updateUserCount(roomId) {
  try {
      const response = await fetch(`/ws/active_users/${roomId}`);
      const data = await response.json();

      const userCountDiv = document.querySelector(".chat-user-count");
      if (userCountDiv) {
          console.log("Active Users:", data.active_users);
          userCountDiv.textContent = `Active Users: ${data.active_users}`;
      } else {
          console.error("❌ User count element not found.");
      }
  } catch (error) {
      console.error("Error fetching active users:", error);
  }
}

setInterval(() => {
  updateUserCount(globalRoom);
}, 10000);

function startchat(event) {
  const room_id = event.currentTarget.id;
  const room_name = event.currentTarget.getAttribute('data-room-name');

  if (!room_id || !room_name) {
      alert("❌ Missing Room ID or Name.");
      return;
  }

  globalRoom = room_id;
  updateChatRoomName(room_name);
  updateUserCount(room_id);
  clearChatArea();

  if (sockets[room_id]) {
      if (sockets[room_id].readyState === WebSocket.OPEN) {
          console.log(`WebSocket for room ${room_id} is already open.`);
          return;
      }
      sockets[room_id].close();
  }

  const ws = new WebSocket(`wss://thawk.xyz/ws/${globalId}/${room_id}`);
  sockets[room_id] = ws;

  ws.onopen = () => {
      console.log(`✅ Connected to room: ${room_name}`);
      document.querySelector("#status").textContent = "🚀 Online ✅";
  };

  ws.onmessage = (event) => {
    try {
      // Check if the data is a valid JSON string
      if (typeof event.data === 'string' && event.data.trim().startsWith('{') && event.data.trim().endsWith('}')) {
        const messageData = JSON.parse(event.data);
        appendMessage({
          text: messageData.text,
          senderName: messageData.senderName,
          timestamp: new Date(messageData.timestamp).toLocaleTimeString()
        }, messageData.senderName === globalName);
      } else {
        // Handle non-JSON messages
        console.log("ℹ️ Received non-JSON message:", event.data);
        appendMessage({
          text: event.data,
          senderName: "System",
          timestamp: new Date().toLocaleTimeString()
        }, false);
      }
    } catch (error) {
      console.error("❌ Error processing message:", error);
    }
  };

  ws.onclose = () => {
      console.warn(`❌ WebSocket for room ${room_id} closed.`);
      document.querySelector("#status").textContent = "❌";
  };

  ws.onerror = (error) => {
      console.error(`❌ WebSocket error in room ${room_id}:`, error);
      document.querySelector("#status").textContent = "❌";
  };
}

document.addEventListener("DOMContentLoaded", () => {
    
    const messageInput = document.getElementById("messageInput");
    const chatArea = document.querySelector(".chat-area-main");

    clearChatArea();

    function connectWebSocket() {
      if (ws && ws.readyState === WebSocket.OPEN) {
          console.log("WebSocket already open.");
          return;
      }
  
      // ws = new WebSocket(`ws://127.0.0.1:8091/ws/${globalName}/${globalRoom}`);
      const ws = new WebSocket(`wss://thawk.xyz/ws/${globalId}/${room_id}`);

      ws.onopen = () => console.log("✅ WebSocket Connected");
      ws.onmessage = (event) => receiveMessage(event.data);
      ws.onclose = () => {
          console.warn("❌ WebSocket closed. Reconnecting in 3 seconds...");
          setTimeout(connectWebSocket, 3000);
      };
      ws.onerror = (error) => console.error("WebSocket Error:", error);
    }

    connectWebSocket();

    messageInput.addEventListener("keypress", function (event) {
        if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault(); // Prevents new line in input
            sendMessage();
        }
    });
  
    function sendMessage() {
        const message = messageInput.value.trim();
        if (!message) return;

        if (ws && ws.readyState === WebSocket.OPEN) {
            const messageData = {
                userId: globalId,
                message: message,
                timestamp: new Date().toISOString(), 
            };

            ws.send(JSON.stringify(messageData)); 

            // Append message to chat area (simulate real-time update)
            appendMessage({
                text: message + 'event',
                senderName: "You",
                timestamp: new Date().toLocaleTimeString(),
            }, true);

            messageInput.value = "";
        } else {
            console.warn("WebSocket is not connected.");
        }
    }

    function receiveMessage(data) {
      try {
          const messageDetails = JSON.parse(data);
    
          if (messageDetails.userId === globalId) return; 
    
          // Use the "text" property here as well
        if (messageDetails.userId === globalId) {
          alert("Message sent successfully!");
        } else {
          appendMessage({
            text: messageDetails.text,
            senderName: messageDetails.userId,
            timestamp: new Date().toLocaleTimeString(),
          }, false);
        }
      } catch (error) {
          console.error("Error parsing received message:", error);
      }
    }

    function appendMessage(messageDetails, isMine) {
      const messageElement = document.createElement("div");
      messageElement.classList.add("chat-msg");
      if (isMine) messageElement.classList.add("owner");
  
      messageElement.innerHTML = `
          <div class="chat-msg-profile">
              <img class="chat-msg-img" src="${globalAvatar}" alt="User Avatar" />
              <div class="chat-msg-date">${messageDetails.timestamp}</div>
          </div>
          <div class="chat-msg-content">
              <div class="chat-msg-text">${messageDetails.text}</div>
          </div>
      `;
  
      chatArea.appendChild(messageElement);
      chatArea.scrollTop = chatArea.scrollHeight;
      scrollDown();
  }
  
    
});

async function handlefetchGroups() {
  const userDetails = await getUserDetails();
  
  updateUserDetails();
  if (!userDetails || !userDetails.id) {
    alert('❌ Failed to fetch user details.');
    return;
  }

  try {
    const memberData = await pb.collection('room_members').getList(1, 50, {
        filter: `user_id = "${userDetails.id}"`,
    });

    const roomIds = memberData.items.map(item => item.room_id);

    if (roomIds.length === 0) {
        alert("❌ No rooms found for this user yet.");
        return;
    }
    const roomFilter = roomIds.map(id => `id = "${id}"`).join(" || ");

    const resultList = await pb.collection('rooms').getList(1, 50, {
        filter: roomFilter,
    });

    const rooms = resultList.items;
    const sidebarContainer = document.getElementById("chat-sidebar");

    sidebarContainer.innerHTML = "";

    rooms.forEach(room => {
        const chatItem = document.createElement("div");
        chatItem.classList.add("msg");

        const avatarUrl = room.avatar ? `https://thawk.xyz/pocketbase/api/files/${room.collectionId}/${room.id}/${room.avatar}` : 'https://img.freepik.com/free-vector/blue-circle-with-white-user_78370-4707.jpg';

        chatItem.innerHTML = `
        <div class="msg-profile group" id="${room.id}" data-room-name="${room.name}" onclick="startchat(event)">
            <img src="${avatarUrl}" alt="Group Avatar" class="msg-profile" />
        </div>
        <div class="msg-detail" id="${room.id}" data-room-name="${room.name}" onclick="startchat(event)">
            <div class="msg-username">${room.name}</div>
            <div class="msg-content">
                <span class="msg-message">Last message...</span>
                <span class="msg-date">Just now</span>
            </div>
        </div>
        <!-- Green circle for new messages -->
        <div class="msg-indicator" id="indicator-${room.id}" style="display: none;"></div>
      `;

        sidebarContainer.appendChild(chatItem);
    });

  } catch (error) {
      console.error("Error fetching rooms:", error);
      alert("❌ Failed to fetch chat rooms.");
  }

}

document.addEventListener("DOMContentLoaded", () => {
  messageInput.addEventListener("keypress", function (event) {
      if (event.key === "Enter" && !event.shiftKey) {
          event.preventDefault();
          sendMessage();
      }
  });

  handlefetchGroups();
});

function closeModal() {
  document.getElementById('exampleModal').classList.remove('show');
  document.body.classList.remove('modal-open');
  document.getElementById('exampleModal').style.display = 'none';
  var backdrop = document.querySelector('.modal-backdrop');
  if (backdrop) {
    backdrop.parentNode.removeChild(backdrop);
  }
}

async function createGroup() {
  const roomName = document.getElementById('roomname').value.trim();
  const roomAddresses = document.getElementById('roomaddress').value.trim().split(' ');
  const roomAvatar = document.getElementById('roomavatar').files[0];

  if (!roomName || roomAddresses.length === 0) {
    alert('Please enter a room name and at least one member address.');
    return;
  }

  const userDetails = await getUserDetails();
  if (!userDetails) {
    alert('Failed to fetch user details.');
    return;
  }

  const formData = new FormData();
  formData.append('name', roomName);
  formData.append('created_by', userDetails.id);
  if (roomAvatar) {
    formData.append('avatar', roomAvatar);
  }

  try {
    const roomRecord = await pb.collection('rooms').create(formData, { $autoCancel: false });

    if (!roomRecord?.id) {
      throw new Error('Room creation failed, no ID returned.');
    }

    const creatorMemberData = {
      room_id: roomRecord.id,
      user_id: userDetails.id,
      joined_at: new Date().toISOString(),
    };
    await pb.collection('room_members').create(creatorMemberData);

    const failedAddresses = [];

    for (const address of roomAddresses) {
      try {
        email = address+'@twark.co.za'
        
        const userRecord = await pb.collection('users').getFirstListItem(`email="${email}"`);

        if (userRecord?.id) {
          const memberData = {
            room_id: roomRecord.id,
            user_id: userRecord.id,
            joined_at: new Date().toISOString(),
          };
          await pb.collection('room_members').create(memberData);
        } else {
          console.warn(`User not found: ${address}`);
          failedAddresses.push(address);
        }
      } catch (error) {
        console.error(`Failed to add member with address: ${address}`, error);
        failedAddresses.push(address);
      }
    }

    if (failedAddresses.length > 0) {
      alert(`Room created, but failed to add the following addresses: ${failedAddresses.join(', ')}`);
    } else {
      alert('Room created successfully!');
    }

    document.getElementById('groupModal').classList.remove('show');
    document.body.classList.remove('modal-open');
    document.getElementById('groupModal').style.display = 'none';
    const backdrop = document.querySelector('.modal-backdrop');
    if (backdrop) {
      backdrop.parentNode.removeChild(backdrop);
    }
  } catch (error) {
    console.error('Error creating room or adding members:', error);
    alert('Failed to create room or add members.');
  }

  handlefetchGroups();
}

function updateProfile() {
  const name = document.getElementById('name').value.trim();
  const avatar = document.getElementById('avatar').files[0];

  if (!name) {
    alert('Please enter a name.');
    return;
  }

  const userDetails = {
    name,
  };

  if (avatar) {
    userDetails.avatar = avatar;
  }

  pb.collection('users').update(globalId, userDetails)
    .then(() => {
      alert('Profile updated successfully!');
      updateUserDetails();
    })
    .catch(error => {
      console.error('Error updating profile:', error);
      alert('Failed to update profile.');
    });
}

// create nft to send to wallet 
function inviteWallet() {
  
}

// list nfts groups
const nfts = [];

// fetch nfts groups
async function showListedNfts() {
  try {
    console.log("Fetching NFTs...");
      // const records = await pb.collection('nft_chat_groups').getFullList({})
      const records = await pb.collection('nft_chat_groups').getList(1, 50, {})
      .catch(error => {
        console.error("PocketBase fetch error:", error);
        alert("Error fetching data from PocketBase.");
        return { items: [] }; // Prevent crash
      });

    const nftList = document.getElementById('nft-list');
    nftList.innerHTML = '';

    if (!records || records.items.length === 0) {
      alert('No NFTs found. ' + records);
      return;
    }

    records.items.forEach(record => {
      nfts.push(record);
      const row = document.createElement('tr');
      row.innerHTML = `
      <td>${record.group_name || 'N/A'}</td>
      <td>${record.chain || 'N/A'}</td>
      <td>
        <a href="${record.collection_address || '#'}" target="_blank" rel="noopener noreferrer">
          <img src="${record.avatar
            ? `https://thawk.xyz/pocketbase/api/files/${record.collectionId}/${record.id}/${record.avatar}`
            : 'https://img.freepik.com/free-vector/blue-circle-with-white-user_78370-4707.jpg'}"
            alt="NFT Avatar" width="50" class=" rounded mx-auto d-block">
        </a>
      </td>
      `;
      // row.innerHTML = `
      //   <a href="${record.collection_address || '#'}" target="_blank" rel="noopener noreferrer">
      //     <td>${record.group_name || 'N/A'}</td>
      //     <td>${record.chain || 'N/A'}</td>
      //     <td>
      //       <img src="${record.avatar
      //           ? `https://thawk.xyz/pocketbase/api/files/${record.collectionId}/${record.id}/${record.avatar}`
      //           : 'https://img.freepik.com/free-vector/blue-circle-with-white-user_78370-4707.jpg'}"
      //           alt="NFT Avatar" width="50">
      //     </td>
      //   </a>
      // `;
      // <td>${record.collection_address || 'N/A'}</td>
      nftList.appendChild(row);
    });
  } catch (error) {
    console.error('Error fetching NFTs:', error);
    alert('Failed to fetch NFTs.');
  }
}

showListedNfts();


async function fetchNFTsForWallet(walletAddress) {
  const graphqlEndpoint = "https://graphql.mainnet.stargaze-apis.com/graphql";

  const query = `
      query {
          tokens(owner: "${walletAddress}") {
              tokens {
                  id
                  name
                  imageUrl
              }
          }
      }
  `;

  try {
      const response = await fetch(graphqlEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query })
      });

      if (!response.ok) {
          throw new Error(`GraphQL Error: ${response.statusText}`);
      }

      const data = await response.json();
      // console.log("NFTs Response:", data);

      return data.data.tokens.tokens || []; // Extract NFT list properly
  } catch (error) {
      // console.error("Error fetching NFTs:", error);
      return [];
  }
}

async function displayNFTs(walletAddress) {
  const grid = document.querySelector(".detail-photo-grid");
  grid.innerHTML = ""; // Clear previous content

  const nfts = await fetchNFTsForWallet(walletAddress);

  if (!nfts || nfts.length === 0) {
      document.querySelector("#nftstatus").textContent = "❌ No NFTs found for this wallet.";
      return;
  }

  if (nfts || nfts.length <= 1) {
    document.querySelector("#nftstatus").textContent = "✅ NFTs found for this wallet.";
  }

  nfts.forEach(nft => {
      // console.log("NFT Object:", nft);
      const img = document.createElement("img");
      img.src = nft.imageUrl || 'placeholder.jpg'; // ✅ Use imageUrl
      img.alt = nft.name || "NFT Image";

      grid.appendChild(img);
  });

  // Update chat sidebar with eligible chat rooms
  updateSidebar(walletAddress);
}

async function connectKeplrAndFetchNFTs() {
  if (!window.keplr) {
      alert("Keplr Wallet not detected. Please install the extension.");
      return;
  }

  try {
      const chainId = "stargaze-1"; // Adjust based on the correct Keplr chain ID
      await window.keplr.enable(chainId);
      const offlineSigner = window.getOfflineSigner(chainId);
      const accounts = await offlineSigner.getAccounts();
      const userAddress = accounts[0].address;

      // console.log("Connected Keplr Wallet:", userAddress);

      // Fetch and display NFTs for this wallet
      displayNFTs(userAddress);
  } catch (error) {
      console.error("Keplr wallet connection failed:", error);
  }
}

const linkNFTsButton = document.querySelector(".view-more");
linkNFTsButton.addEventListener("click", connectKeplrAndFetchNFTs);

async function updateSidebar(userAddress) {
  const sidebarContainer = document.getElementById("chat-sidebar");

  // Fetch user's NFTs from their wallet
  const userNFTs = await fetchNFTsForWallet(userAddress);

  if (!userNFTs || userNFTs.length === 0) {
      console.log("No NFTs found for this wallet.");
      return;
  }

  // Function to calculate Levenshtein distance
  function levenshteinDistance(s1, s2) {
    const len1 = s1.length, len2 = s2.length;
    const dp = Array.from(Array(len1 + 1), () => Array(len2 + 1).fill(0));

    for (let i = 0; i <= len1; i++) dp[i][0] = i;
    for (let j = 0; j <= len2; j++) dp[0][j] = j;

    for (let i = 1; i <= len1; i++) {
        for (let j = 1; j <= len2; j++) {
            const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
            dp[i][j] = Math.min(
                dp[i - 1][j] + 1,       // Deletion
                dp[i][j - 1] + 1,       // Insertion
                dp[i - 1][j - 1] + cost // Substitution
            );
        }
    }

    return dp[len1][len2];
  }

  // Function to calculate similarity percentage
  function similarityPercentage(str1, str2) {
    const maxLength = Math.max(str1.length, str2.length);
    if (maxLength === 0) return 100;
    const distance = levenshteinDistance(str1, str2);
    return ((maxLength - distance) / maxLength) * 100; // Convert to percentage
  }

  // Match NFT names to chat groups with 60% similarity threshold
  const THRESHOLD = 60;

  const eligibleChatGroups = nfts.filter(chatGroup =>
    userNFTs.some(nft => {
        const similarity = similarityPercentage(nft.name.toLowerCase(), chatGroup.group_name.toLowerCase());
        // alert(`NFT Name: ${nft.name}, Chat Group Name: ${chatGroup.group_name} ~ Similarity: ${similarity}%`);
        return similarity >= THRESHOLD;  // Ensure at least 80% match
    })
  );

  if (eligibleChatGroups.length === 0) {
      console.log("No matching NFT chat groups found.");
      alert("No matching NFT chat groups found.");
      return;
  }

  // Append new NFT chat groups if they are not already in the sidebar
  eligibleChatGroups.forEach(room => {
      if (document.getElementById(`nft-room-${room.id}`)) {
          return;
      }

      const chatItem = document.createElement("div");
      chatItem.classList.add("msg");
      chatItem.id = `nft-room-${room.id}`; // Unique ID to prevent duplicates

      const avatarUrl = room.avatar
          ? `https://thawk.xyz/pocketbase/api/files/${room.collectionId}/${room.id}/${room.avatar}`
          : 'https://img.freepik.com/free-vector/blue-circle-with-white-user_78370-4707.jpg';

      chatItem.innerHTML = `
      <div class="msg-profile group" id="${room.id}" data-room-name="${room.group_name}" onclick="startchat(event)">
          <img src="${avatarUrl}" alt="Group Avatar" class="msg-profile" />
      </div>
      <div class="msg-detail" id="${room.id}" data-room-name="${room.group_name}" onclick="startchat(event)">
          <div class="msg-username">${room.group_name}</div>
          <div class="msg-content">
              <span class="msg-message">Last message...</span>
              <span class="msg-date">Just now</span>
          </div>
      </div>
      <!-- Green circle for new messages -->
      <div class="msg-indicator" id="indicator-${room.id}" style="display: none;"></div>
      `;

      sidebarContainer.appendChild(chatItem);
  });

  // console.log("Appended NFT chat groups to the sidebar.");
}

function logout() {
  localStorage.removeItem('authToken');
  location.reload();
}

function sendNft() {
  const nftId = document.getElementById('nftId').src;  // Get NFT image URL
  const walletAddress = document.getElementById('nft-address').value.trim(); // Corrected input field ID

  if (!walletAddress) {
    alert('Please enter a wallet address.');
    return;
  }

  const nftData = {
    nft_image: nftId,  // Use `nft_image` instead of `nft_id` if storing image URL
    wallet_address: walletAddress,
  };
  // alert('✅ NFT sent successfully!');
  alert('❌ Failed to send NFT.');
}


function requestcollection() {
  let collection_name = prompt("Enter the collection name:");
  let collection_address = prompt("Enter the collection address:");
  let collection_chain = prompt("Enter the collection chain:");

  // Corrected condition check
  if (collection_name && collection_address && collection_chain) {
    const collectionData = {
      collection_name: collection_name,
      collection_address: collection_address,
      collection_chain: collection_chain
    };

    pb.collection('request_nft').create(collectionData)
      .then(() => {
        alert('Request sent successfully!');
      })
      .catch(error => {
        console.error('Error sending request:', error);
        alert('Failed to send request.');
      });
  } else {
    alert("All fields are required.");
  }
}

function filterChatRooms() {
  let input = document.getElementById("chatSearch").value.toLowerCase(); // Get search text
  let chatRooms = document.querySelectorAll("#chat-sidebar .msg"); // Select all chat room wrappers

  chatRooms.forEach(room => {
      let roomName = room.querySelector("[data-room-name]").getAttribute("data-room-name").toLowerCase(); // Get room name

      if (roomName.includes(input)) {
          room.style.display = ""; // Show matching rooms
      } else {
          room.style.display = "none"; // Hide non-matching rooms
      }
  });
}

function clearfilter() {
  let searchInput = document.getElementById("chatSearch");
  searchInput.value = "";
  searchInput.focus();
  filterChatRooms();
}

