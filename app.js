import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, collection, addDoc, query, orderBy, limit, onSnapshot, serverTimestamp, updateDoc, increment, runTransaction, deleteDoc } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-storage.js";

// Paste the SAME Firebase web config used in BHAROVA V3.
const firebaseConfig = {
  apiKey: "AIzaSyD4b9fZe4nisrxr_fK6-3QxeVG1YexMk3k",
  authDomain: "bharova-1caef.firebaseapp.com",
  projectId: "bharova-1caef",
  storageBucket: "bharova-1caef.firebasestorage.app",
  messagingSenderId: "1036509077975",
  appId: "1:1036509077975:web:77c8c03a642c93339feb92"
};
const $=s=>document.querySelector(s);let auth,db,storage,currentUser=null,unsubscribe=null,selectedFile=null;
const ready=Object.values(firebaseConfig).every(v=>v&&!v.startsWith("PASTE_"));
if(ready){const app=initializeApp(firebaseConfig);auth=getAuth(app);db=getFirestore(app);storage=getStorage(app);$("#status").textContent="Checking your account...";}
else $("#status").textContent="Firebase setup required. Follow FIREBASE_SETUP.txt and add your config to app.js.";
function msg(t){$("#status").textContent=t}
function tab(which){$("#signup").classList.toggle("hidden",which!=="signup");$("#login").classList.toggle("hidden",which!=="login");$("#signupTab").classList.toggle("active",which==="signup");$("#loginTab").classList.toggle("active",which==="login")}
$("#signupTab").onclick=()=>tab("signup");$("#loginTab").onclick=()=>tab("login");
$("#signup").onsubmit=e=>{e.preventDefault();msg("Use the BHAROVA V3 account page to create an account, then return here to use V4.")};
$("#login").onsubmit=async e=>{
 e.preventDefault();
 try{
  msg("Signing in...");
  await signInWithEmailAndPassword(auth,$("#loginEmail").value.trim(),$("#loginPassword").value);
 }catch(err){
  msg("Login failed: "+(err.code||err.message));
 }
};
$("#logout").onclick=()=>signOut(auth);
onAuthStateChanged(auth,user=>{
 currentUser=user;
 if(!user){$("#authCard").classList.remove("hidden");$("#app").classList.add("hidden");$("#logout").classList.add("hidden");$("#who").textContent="Not signed in";if(unsubscribe)unsubscribe();return;}
 $("#authCard").classList.add("hidden");$("#app").classList.remove("hidden");$("#logout").classList.remove("hidden");$("#who").textContent=user.displayName||user.email;
 loadProfile();listenFeed();
});

async function loadProfile() {
  const snap = await getDoc(doc(db, "users", currentUser.uid));
  const data = snap.exists() ? snap.data() : {};

  $("#profileName").textContent = data.displayName || currentUser.displayName || "BHAROVA member";
  $("#profileEmail").textContent = currentUser.email || "";
  $("#bioText").textContent = data.bio || "Add a short bio to introduce yourself.";
  $("#postCount").textContent = data.postCount || 0;
  $("#followerCount").textContent = data.followerCount || 0;
  $("#followingCount").textContent = data.followingCount || 0;

  const photo = $("#profilePhoto");
  if (data.photoURL) {
    photo.src = data.photoURL;
    photo.classList.remove("hidden");
  } else {
    photo.removeAttribute("src");
    photo.classList.add("hidden");
  }
}

$("#editProfile").onclick = async () => {
  const snap = await getDoc(doc(db, "users", currentUser.uid));
  const d = snap.exists() ? snap.data() : {};

  $("#editName").value = d.displayName || currentUser.displayName || "";
  $("#editBio").value = d.bio || "";
  $("#editPhotoUrl").value = d.photoURL || "";
  $("#modalTitle").textContent = "Edit your profile";
  $("#profileForm").classList.remove("hidden");
  $("#commentForm").classList.add("hidden");
  $("#modal").showModal();
};

$("#profileForm").onsubmit = async e => {
  e.preventDefault();

  try {
    const displayName = $("#editName").value.trim();
    const bio = $("#editBio").value.trim();
    const photoURL = $("#editPhotoUrl").value.trim();

    if (displayName.length < 2) {
      alert("Name must be at least 2 characters.");
      return;
    }

    if (photoURL && !/^https?:\/\//i.test(photoURL)) {
      alert("Please enter a valid photo URL.");
      return;
    }

    await setDoc(doc(db, "users", currentUser.uid), {
      displayName,
      bio,
      photoURL
    }, { merge: true });

    const authModule = await import("https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js");
    await authModule.updateProfile(currentUser, { displayName, photoURL });

    $("#modal").close();
    await loadProfile();
  } catch (err) {
    alert(err.message);
  }
};
$("#photo").onchange = () => {
  selectedFile = $("#photo").files[0] || null;
  const preview = $("#photoPreview");

  if (!selectedFile) {
    preview.classList.add("hidden");
    preview.removeAttribute("src");
    $("#fileName").textContent = "";
    return;
  }

  if (!selectedFile.type.startsWith("image/")) {
    alert("Please select an image.");
    $("#photo").value = "";
    selectedFile = null;
    return;
  }

  preview.src = URL.createObjectURL(selectedFile);
  preview.classList.remove("hidden");
  $("#fileName").textContent = "Selected: " + selectedFile.name;
$("#fileName").style.display = "inline-block";
$("#fileName").style.color = "#1d4ed8";
$("#fileName").style.fontWeight = "bold";
}

async function compressImage(file) {
  const bitmap = await createImageBitmap(file);
  let scale = Math.min(1, 1280 / Math.max(bitmap.width, bitmap.height));

  for (let i = 0; i < 6; i++) {
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));

    canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    const data = canvas.toDataURL("image/jpeg", 0.7 - i * 0.06);

    if (data.length <= 600000) {
      bitmap.close();
      return data;
    }

    scale *= 0.8;
  }

  bitmap.close();
  throw new Error("Photo is too large. Choose another photo.");
}

$("#publish").onclick = async () => {
  const text = $("#postText").value.trim();

  if (!text && !selectedFile) {
    alert("Write a post or select a photo.");
    return;
  }

  if (text.length > 1500) {
    alert("Post is too long.");
    return;
  }

  const btn = $("#publish");
  btn.disabled = true;

  try {
    let mediaUrl = "";
    let mediaType = "";

    if (selectedFile) {
      if (!selectedFile.type.startsWith("image/")) {
        throw new Error("Please select an image.");
      }

      mediaUrl = await compressImage(selectedFile);
      mediaType = "image/jpeg";
    }

    await addDoc(collection(db, "posts"), {
      uid: currentUser.uid,
      displayName: currentUser.displayName || "BHAROVA member",
      text,
      mediaUrl,
      mediaType,
      createdAt: serverTimestamp(),
      likeCount: 0,
      commentCount: 0
    });

    await updateDoc(doc(db, "users", currentUser.uid), {
      postCount: increment(1)
    });

    $("#postText").value = "";
    $("#photo").value = "";
    $("#fileName").textContent = "";
    $("#photoPreview").classList.add("hidden");
    $("#photoPreview").removeAttribute("src");
    selectedFile = null;

    await loadProfile();
  } catch (err) {
    alert("Post failed: " + err.message);
  } finally {
    btn.disabled = false;
  }
};

function listenFeed(){if(unsubscribe)unsubscribe();const q=query(collection(db,"posts"),orderBy("createdAt","desc"),limit(40));unsubscribe=onSnapshot(q,snap=>{const feed=$("#feed");feed.innerHTML="";if(snap.empty){feed.innerHTML='<div class="card placeholder">No posts yet. Be the first to share something!</div>';return;}snap.forEach(d=>feed.append(renderPost(d.id,d.data())));},err=>{msg("Feed error: "+err.message)});}
function renderPost(id, p) {
  const article = document.createElement("article");
  article.className = "card";

  const head = document.createElement("div");
  head.className = "post-head";

  const avatar = document.createElement("span");
  avatar.className = "avatar";
  avatar.textContent = (p.displayName || "B").charAt(0).toUpperCase();

  const meta = document.createElement("div");
  const name = document.createElement("b");
  const small = document.createElement("small");

  name.textContent = p.displayName || "BHAROVA member";
  small.textContent = p.createdAt?.toDate
    ? p.createdAt.toDate().toLocaleString()
    : "Just now";

  meta.append(name, small);
  head.append(avatar, meta);
  article.append(head);

  if (p.text) {
    const para = document.createElement("p");
    para.className = "post-copy";
    para.textContent = p.text;
    article.append(para);
  }

  if (p.mediaUrl) {
    const img = document.createElement("img");
    img.className = "post-media";
    img.src = p.mediaUrl;
    img.alt = "Community post image";
    article.append(img);
  }

  const actions = document.createElement("div");
  actions.className = "post-actions";

  const like = document.createElement("button");
  like.textContent = `♡ Like (${p.likeCount || 0})`;
  like.onclick = () => likePost(id);

  const comment = document.createElement("button");
  comment.textContent = `Comment (${p.commentCount || 0})`;
  comment.onclick = () => openComments(id);

  const follow = document.createElement("button");
  follow.textContent = p.uid === currentUser.uid ? "Your post" : "＋ Follow";
  follow.disabled = p.uid === currentUser.uid;
  follow.onclick = () => followUser(p.uid);

  actions.append(like, comment, follow);

  if (p.uid === currentUser.uid) {
    const del = document.createElement("button");
    del.textContent = "Delete";
    del.onclick = () => deletePost(id);
    actions.append(del);
  }

  article.append(actions);
  return article;
}
async function deletePost(postId) {
  if (!confirm("Are you sure you want to delete this post?")) {
    return;
  }

  try {
    const postRef = doc(db, "posts", postId);
    const userRef = doc(db, "users", currentUser.uid);

    await runTransaction(db, async (tx) => {
      const postSnap = await tx.get(postRef);
      const userSnap = await tx.get(userRef);

      if (!postSnap.exists()) {
        throw new Error("Post not found.");
      }

      if (postSnap.data().uid !== currentUser.uid) {
        throw new Error("You cannot delete another user's post.");
      }

      tx.delete(postRef);

      if (userSnap.exists()) {
        const count = userSnap.data().postCount || 0;
        tx.update(userRef, {
          postCount: Math.max(0, count - 1)
        });
      }
    });

    await loadProfile();
    alert("Post deleted successfully!");
  } catch (error) {
    alert("Delete failed: " + error.message);
  }
}
async function likePost(postId){try{const likeRef=doc(db,"posts",postId,"likes",currentUser.uid);await runTransaction(db,async tx=>{const snap=await tx.get(likeRef),postRef=doc(db,"posts",postId);if(snap.exists()){tx.delete(likeRef);tx.update(postRef,{likeCount:increment(-1)});}else{tx.set(likeRef,{uid:currentUser.uid,createdAt:serverTimestamp()});tx.update(postRef,{likeCount:increment(1)});}});}catch(e){alert(e.message)}}
async function followUser(targetUid){if(!targetUid||targetUid===currentUser.uid)return;try{const followRef=doc(db,"users",targetUid,"followers",currentUser.uid),followingRef=doc(db,"users",currentUser.uid,"following",targetUid);const existing=await getDoc(followRef);if(existing.exists()){alert("Already following, or unfollow support will be added in the next update.");return;}await setDoc(followRef,{uid:currentUser.uid,createdAt:serverTimestamp()});await setDoc(followingRef,{uid:targetUid,createdAt:serverTimestamp()});alert("Follow request saved.");}catch(e){alert("Follow could not be completed: "+e.message)}}
async function openComments(postId){$("#modalTitle").textContent="Comments";$("#profileForm").classList.add("hidden");$("#commentForm").classList.remove("hidden");$("#commentText").value="";$("#modal").dataset.postId=postId;$("#modal").showModal();const existing=$("#commentList");if(existing)existing.remove();const list=document.createElement("div");list.id="commentList";list.className="comments";$("#commentForm").prepend(list);try{const {getDocs}=await import("https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js");const q=query(collection(db,"posts",postId,"comments"),orderBy("createdAt","asc"),limit(30));const snap=await getDocs(q);snap.forEach(d=>{const line=document.createElement("div");line.className="comment-line";const b=document.createElement("b");b.textContent=d.data().displayName||"Member";line.append(b,document.createTextNode(d.data().text));list.append(line);});}catch(e){list.textContent="Comments could not be loaded.";}}
$("#sendComment").onclick=async()=>{const text=$("#commentText").value.trim(),postId=$("#modal").dataset.postId;if(!text)return;if(text.length>500){alert("Comment is too long.");return;}try{await addDoc(collection(db,"posts",postId,"comments"),{uid:currentUser.uid,displayName:currentUser.displayName||"Member",text,createdAt:serverTimestamp()});await updateDoc(doc(db,"posts",postId),{commentCount:increment(1)});$("#modal").close();}catch(e){alert(e.message)}};
$("#close").onclick=()=>$("#modal").close();
