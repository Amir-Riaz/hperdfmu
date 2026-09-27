// HPERD CMS — Admin Dashboard Application Logic
// Full-page editor version
// The old publish modal is no longer used.

let currentUser = null;

let currentFilter = {
  view: 'dashboard',
  type: '',
  status: ''
};

let galleryFiles = [];
let attachmentFiles = [];
let coverPath = null;

let editingPostId = null;
let hasUnsavedChanges = false;
let autosaveTimer = null;

let postSearchDebounce = null;
let mediaSearchDebounce = null;


/* =========================================================
   AUTH GUARD
========================================================= */

(async () => {
  try {
    const user = await apiCall('/auth/me.php');

    currentUser = user;

    const email = user.email || '';
    const name =
      user.name ||
      user.full_name ||
      user.display_name ||
      email;

    // Header / sidebar user information
    const adminEmail = document.getElementById('adminEmail');
    const sidebarAdminEmail = document.getElementById('sidebarAdminEmail');
    const settingsEmail = document.getElementById('settingsEmail');

    if (adminEmail) {
      adminEmail.textContent = name;
    }

    if (sidebarAdminEmail) {
      sidebarAdminEmail.textContent = name;
    }

    if (settingsEmail) {
      settingsEmail.textContent = email;
    }

    const authGate = document.getElementById('authGate');

    if (authGate) {
      authGate.remove();
    }

    // Initial dashboard
    showView('dashboard');

    await Promise.all([
      loadDashboardStats(),
      loadPosts()
    ]);

  } catch (err) {
    window.location.href = 'login.html';
  }
})();


/* =========================================================
   LOGOUT
========================================================= */

const logoutBtn = document.getElementById('logoutBtn');

if (logoutBtn) {
  logoutBtn.addEventListener('click', async () => {
    try {
      await apiCall('/auth/logout.php', {
        method: 'POST'
      });
    } finally {
      window.location.href = 'login.html';
    }
  });
}


/* =========================================================
   SETTINGS
========================================================= */

const changePasswordBtn =
  document.getElementById('changePasswordBtn');

if (changePasswordBtn) {
  changePasswordBtn.addEventListener('click', async () => {

    const current_password =
      prompt('Enter your current password:');

    if (!current_password) return;

    const new_password =
      prompt('Enter your new password (min 8 characters):');

    if (!new_password) return;

    if (new_password.length < 8) {
      toast(
        'New password must be at least 8 characters.',
        'error'
      );
      return;
    }

    try {
      await apiCall('/auth/change-password.php', {
        method: 'POST',
        body: {
          current_password,
          new_password
        }
      });

      toast('Password changed.');

    } catch (err) {
      toast(
        err.message || 'Could not change password.',
        'error'
      );
    }
  });
}


/* =========================================================
   NAVIGATION
========================================================= */

const viewTitles = {
  dashboard: 'Dashboard',
  posts: 'Posts',
  media: 'Media Library',
  settings: 'Settings',
  editor: 'New Content'
};


const sidebarNav =
  document.getElementById('sidebarNav');

if (sidebarNav) {

  sidebarNav.addEventListener('click', (e) => {

    const btn =
      e.target.closest('.nav-item');

    if (!btn) return;

    /*
     * If currently editing, warn before leaving.
     */
    if (
      !document
        .getElementById('view-editor')
        ?.classList.contains('hidden')
    ) {

      if (hasUnsavedChanges) {

        const leave =
          confirm(
            'You have unsaved changes. Leave this page?'
          );

        if (!leave) return;
      }

      stopAutosave();
    }


    document
      .querySelectorAll('#sidebarNav .nav-item')
      .forEach(b => {
        b.classList.remove('active');
      });

    btn.classList.add('active');


    const view =
      btn.dataset.view || 'dashboard';

    currentFilter = {
      view,
      type: btn.dataset.type || '',
      status: btn.dataset.status || ''
    };


    showView(view);


    if (view === 'posts') {

      const statusFilter =
        document.getElementById(
          'postStatusFilter'
        );

      if (statusFilter) {
        statusFilter.value =
          currentFilter.status || '';
      }

      loadPosts();

    } else if (view === 'media') {

      loadMedia();

    } else if (view === 'dashboard') {

      loadDashboardStats();
    }


    closeSidebarMobile();
  });
}


/* =========================================================
   SHOW VIEW
========================================================= */

function showView(view) {

  document
    .querySelectorAll('.view-panel')
    .forEach(panel => {
      panel.classList.add('hidden');
    });


  const target =
    document.getElementById(`view-${view}`);

  if (target) {
    target.classList.remove('hidden');
  }


  const pageTitle =
    document.getElementById('pageTitle');

  if (pageTitle) {

    pageTitle.textContent =
      viewTitles[view] ||
      'Dashboard';
  }


  /*
   * New button:
   *
   * On editor page it is disabled.
   * Everywhere else it is enabled.
   */
  updateNewButtonState(view);
}


/* =========================================================
   NEW BUTTON STATE
========================================================= */

function updateNewButtonState(view) {

  const newPostBtn =
    document.getElementById('newPostBtn');

  if (!newPostBtn) return;


  if (view === 'editor') {

    newPostBtn.disabled = true;

    newPostBtn.setAttribute(
      'aria-disabled',
      'true'
    );

    newPostBtn.classList.add(
      'opacity-40',
      'cursor-not-allowed',
      'pointer-events-none'
    );

    newPostBtn.setAttribute(
      'title',
      'You are already creating content'
    );

  } else {

    newPostBtn.disabled = false;

    newPostBtn.removeAttribute(
      'aria-disabled'
    );

    newPostBtn.classList.remove(
      'opacity-40',
      'cursor-not-allowed',
      'pointer-events-none'
    );

    newPostBtn.removeAttribute('title');
  }
}


/* =========================================================
   MOBILE SIDEBAR
========================================================= */

const menuToggle =
  document.getElementById('menuToggle');

if (menuToggle) {

  menuToggle.addEventListener('click', () => {

    const sidebar =
      document.getElementById('sidebar');

    const overlay =
      document.getElementById('sidebarOverlay');

    if (sidebar) {
      sidebar.classList.remove(
        '-translate-x-full'
      );
    }

    if (overlay) {
      overlay.classList.remove(
        'hidden'
      );
    }
  });
}


const sidebarOverlay =
  document.getElementById('sidebarOverlay');

if (sidebarOverlay) {
  sidebarOverlay.addEventListener(
    'click',
    closeSidebarMobile
  );
}


function closeSidebarMobile() {

  const sidebar =
    document.getElementById('sidebar');

  const overlay =
    document.getElementById('sidebarOverlay');


  if (sidebar) {

    sidebar.classList.add(
      '-translate-x-full'
    );
  }

  if (overlay) {

    overlay.classList.add(
      'hidden'
    );
  }
}


/* =========================================================
   DASHBOARD
========================================================= */

async function loadDashboardStats() {

  const statCards =
    document.getElementById('statCards');

  const recentActivity =
    document.getElementById('recentActivity');


  try {

    const stats =
      await apiCall(
        '/dashboard/stats.php'
      );


    const cards = [

      {
        label: 'Total Posts',
        value: stats.total_posts ?? 0,
        icon: '📄'
      },

      {
        label: 'Published',
        value: stats.published ?? 0,
        icon: '✅'
      },

      {
        label: 'Drafts',
        value: stats.drafts ?? 0,
        icon: '📝'
      },

      {
        label: 'Upcoming Events',
        value: stats.upcoming_events ?? 0,
        icon: '📅'
      }

    ];


    if (statCards) {

      statCards.innerHTML =
        cards.map(c => `

          <div class="card-panel">

            <p class="text-2xl">
              ${c.icon}
            </p>

            <p class="
              text-3xl
              font-display
              font-semibold
              text-navy
              mt-2
            ">
              ${c.value}
            </p>

            <p class="
              text-sm
              text-ink-soft
              mt-1
            ">
              ${escapeHtml(c.label)}
            </p>

          </div>

        `).join('');
    }


    if (recentActivity) {

      recentActivity.innerHTML =
        stats.recent_activity?.length

          ? stats.recent_activity.map(p => `

              <div class="
                py-3
                flex
                items-center
                justify-between
                gap-4
              ">

                <div class="min-w-0">

                  <p class="
                    text-sm
                    font-medium
                    text-navy
                    truncate
                  ">
                    ${escapeHtml(p.title)}
                  </p>

                  <p class="
                    text-xs
                    text-ink-soft
                    mt-0.5
                    capitalize
                  ">
                    ${escapeHtml(p.type || '')}
                    ·
                    ${escapeHtml(p.status || '')}
                  </p>

                </div>

                <span class="
                  text-xs
                  text-ink-soft
                  whitespace-nowrap
                ">
                  ${formatDate(p.updated_at)}
                </span>

              </div>

            `).join('')

          : `
              <p class="
                text-sm
                text-ink-soft
                py-4
              ">
                No activity yet.
              </p>
            `;
    }

  } catch (err) {

    toast(
      err.message || 'Could not load dashboard.',
      'error'
    );
  }
}


/* =========================================================
   POSTS SEARCH
========================================================= */

const postSearch =
  document.getElementById('postSearch');

if (postSearch) {

  postSearch.addEventListener(
    'input',
    () => {

      clearTimeout(
        postSearchDebounce
      );

      postSearchDebounce =
        setTimeout(
          loadPosts,
          350
        );
    }
  );
}


const postStatusFilter =
  document.getElementById(
    'postStatusFilter'
  );

if (postStatusFilter) {

  postStatusFilter.addEventListener(
    'change',
    loadPosts
  );
}


/* =========================================================
   LOAD POSTS
========================================================= */

async function loadPosts() {

  const tbody =
    document.getElementById(
      'postsTableBody'
    );

  if (!tbody) return;


  tbody.innerHTML = `
    <tr>
      <td colspan="5" class="py-6">
        ${skeletonRows(3)}
      </td>
    </tr>
  `;


  try {

    const search =
      document
        .getElementById('postSearch')
        ?.value
        .trim() || '';


    const status =
      document
        .getElementById('postStatusFilter')
        ?.value ||
      currentFilter.status ||
      '';


    const params =
      new URLSearchParams({

        scope: 'admin',

        search,

        status,

        type:
          currentFilter.type || '',

        limit: '50'

      });


    const data =
      await apiCall(
        `/posts/list.php?${params.toString()}`
      );


    const posts =
      Array.isArray(data.posts)
        ? data.posts
        : [];


    tbody.innerHTML =
      posts.length

        ? posts.map(rowHtml).join('')

        : `
          <tr>
            <td
              colspan="5"
              class="
                py-8
                text-center
                text-ink-soft
                text-sm
              "
            >
              No posts yet — click
              "+ New" to create one.
            </td>
          </tr>
        `;

  } catch (err) {

    toast(
      err.message || 'Could not load posts.',
      'error'
    );
  }
}


/* =========================================================
   POST TABLE ROW
========================================================= */

function rowHtml(p) {

  const statusColor = {

    published: 'text-teal',

    draft: 'text-ink-soft',

    scheduled: 'text-gold'

  }[p.status] || 'text-ink-soft';


  const title =
    escapeHtml(p.title || 'Untitled');


  const safeTitle =
    String(p.title || '')
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "\\'");


  return `

    <tr class="
      border-b
      border-navy/5
      hover:bg-mist/50
    ">

      <td class="
        py-3
        pr-4
        font-medium
        text-navy
        max-w-xs
        truncate
      ">
        ${title}
      </td>


      <td class="
        py-3
        pr-4
        capitalize
        text-ink-soft
      ">
        ${escapeHtml(p.type || '')}
      </td>


      <td class="
        py-3
        pr-4
        capitalize
        ${statusColor}
        font-medium
      ">
        ${escapeHtml(p.status || '')}
      </td>


      <td class="
        py-3
        pr-4
        text-ink-soft
      ">
        ${formatDate(p.updated_at)}
      </td>


      <td class="
        py-3
        pr-2
        text-right
        space-x-3
        whitespace-nowrap
      ">

        <button
          class="
            text-teal
            hover:text-navy
            text-xs
            font-medium
          "
          onclick="editPost(${Number(p.id)})"
        >
          Edit
        </button>


        <button
          class="
            text-red-600
            hover:text-red-800
            text-xs
            font-medium
          "
          onclick="
            deletePost(
              ${Number(p.id)},
              '${safeTitle}'
            )
          "
        >
          Delete
        </button>

      </td>

    </tr>
  `;
}


/* =========================================================
   OPEN FULL-PAGE EDITOR
========================================================= */

function openEditor(
  mode = 'new',
  post = null
) {

  /*
   * Stop any previous autosave.
   */
  stopAutosave();


  /*
   * Hide every dashboard view.
   */
  document
    .querySelectorAll('.view-panel')
    .forEach(panel => {
      panel.classList.add('hidden');
    });


  /*
   * Find full-page editor.
   */
  const editor =
    document.getElementById(
      'view-editor'
    );


  if (!editor) {

    console.error(
      'view-editor was not found in index.html'
    );

    toast(
      'Editor page is missing.',
      'error'
    );

    return;
  }


  /*
   * Show editor.
   */
  editor.classList.remove('hidden');


  /*
   * Set page title.
   */
  const pageTitle =
    document.getElementById(
      'pageTitle'
    );


  if (pageTitle) {

    pageTitle.textContent =
      mode === 'edit'
        ? 'Edit Content'
        : 'New Content';
  }


  /*
   * Disable New button while editor
   * is displayed.
   */
  updateNewButtonState(
    'editor'
  );


  /*
   * Set editor title if present.
   */
  const editorTitle =
    document.getElementById(
      'editorTitle'
    );


  if (editorTitle) {

    editorTitle.textContent =
      mode === 'edit'
        ? 'Edit Content'
        : 'New Content';
  }


  /*
   * Set editing ID.
   */
  editingPostId =
    mode === 'edit' && post
      ? post.id
      : null;


  hasUnsavedChanges = false;


  /*
   * Reset editor for new post.
   */
  if (mode === 'new') {

    resetEditor();

    startAutosave();

    return;
  }


  /*
   * Load existing post.
   */
  if (
    mode === 'edit' &&
    post
  ) {

    loadPostIntoEditor(post);

    startAutosave();
  }
}


/* =========================================================
   RESET EDITOR
========================================================= */

function resetEditor() {

  const form =
    document.getElementById(
      'publishForm'
    );

  if (form) {
    form.reset();
  }


  editingPostId = null;

  galleryFiles = [];

  attachmentFiles = [];

  coverPath = null;

  hasUnsavedChanges = false;


  /*
   * Clear hidden ID.
   */
  const postId =
    document.getElementById(
      'postId'
    );

  if (postId) {
    postId.value = '';
  }


  /*
   * Default author.
   */
  const author =
    document.getElementById(
      'fAuthor'
    );

  if (author) {

    author.value =
      currentUser?.name ||
      currentUser?.full_name ||
      currentUser?.display_name ||
      currentUser?.email ||
      '';
  }


  /*
   * Default type.
   */
  setType(
    currentFilter.type ||
    'announcement'
  );


  /*
   * Default status.
   */
  const status =
    document.getElementById(
      'fStatus'
    );

  if (status) {
    status.value = 'draft';
  }


  toggleScheduledField();


  /*
   * Reset slug user-edit flag.
   */
  const slug =
    document.getElementById(
      'fSlug'
    );

  if (slug) {
    delete slug.dataset.userEdited;
    slug.value = '';
  }


  /*
   * Reset cover.
   */
  renderCover(null);


  /*
   * Reset gallery.
   */
  renderGallery([]);


  /*
   * Reset attachments.
   */
  renderAttachments([]);


  /*
   * Initialize editor.
   */
  initEditor('#fBody')
    .then(() => {
      setEditorContent(
        '#fBody',
        ''
      );
    })
    .catch(err => {
      console.error(
        'TinyMCE initialization failed:',
        err
      );
    });


  /*
   * Clear local new-post draft
   * only when explicitly starting fresh.
   */
  clearLocalDraft();
}


/* =========================================================
   LOAD POST INTO FULL-PAGE EDITOR
========================================================= */

function loadPostIntoEditor(post) {

  const form =
    document.getElementById(
      'publishForm'
    );


  if (form) {
    form.reset();
  }


  editingPostId =
    post.id;


  galleryFiles =
    Array.isArray(post.gallery)
      ? post.gallery
      : [];


  attachmentFiles =
    Array.isArray(post.attachments)
      ? post.attachments
      : [];


  coverPath =
    post.cover_image ||
    null;


  hasUnsavedChanges = false;


  const values = {

    postId: post.id || '',

    fTitle: post.title || '',

    fSlug: post.slug || '',

    fCategory: post.category || '',

    fAuthor:
      post.author ||
      currentUser?.name ||
      currentUser?.email ||
      '',

    fStatus:
      post.status ||
      'draft',

    fScheduledAt:
      post.scheduled_at
        ? String(post.scheduled_at)
            .replace(' ', 'T')
            .slice(0, 16)
        : '',

    fEventDate:
      post.event_date || '',

    fStartTime:
      post.start_time || '',

    fEndTime:
      post.end_time || '',

    fVenue:
      post.venue || '',

    fOrganizer:
      post.organizer || '',

    fMetaTitle:
      post.meta_title || '',

    fMetaDescription:
      post.meta_description || ''

  };


  Object.entries(values)
    .forEach(([id, value]) => {

      const element =
        document.getElementById(id);

      if (element) {
        element.value = value;
      }
    });


  /*
   * Preserve manually-set slug.
   */
  const slug =
    document.getElementById(
      'fSlug'
    );

  if (slug) {
    slug.dataset.userEdited = '1';
  }


  setType(
    post.type ||
    'announcement'
  );


  toggleScheduledField();


  renderCover(
    post.cover_image || null
  );


  renderGallery(
    post.gallery || []
  );


  renderAttachments(
    post.attachments || []
  );


  initEditor('#fBody')
    .then(() => {

      setEditorContent(
        '#fBody',
        post.body_html || ''
      );

    })
    .catch(err => {

      console.error(
        'TinyMCE initialization failed:',
        err
      );
    });


  /*
   * Offer locally saved changes.
   */
  maybeOfferLocalDraft();
}


/* =========================================================
   NEW BUTTON
========================================================= */

const newPostBtn =
  document.getElementById(
    'newPostBtn'
  );


if (newPostBtn) {

  newPostBtn.addEventListener(
    'click',
    () => {

      /*
       * Extra safety:
       * don't do anything if already disabled.
       */
      if (newPostBtn.disabled) {
        return;
      }


      openEditor('new');
    }
  );
}


/* =========================================================
   DELETE POST
========================================================= */

async function deletePost(
  id,
  title
) {

  const ok =
    await confirmModal({

      title:
        'Delete this post?',

      message:
        `"${title}" will be permanently removed, including its images and attachments.`

    });


  if (!ok) return;


  try {

    await apiCall(
      '/posts/delete.php',
      {
        method: 'POST',
        body: { id }
      }
    );


    toast(
      'Post deleted.'
    );


    await Promise.all([
      loadPosts(),
      loadDashboardStats()
    ]);

  } catch (err) {

    toast(
      err.message ||
      'Could not delete post.',
      'error'
    );
  }
}


/* =========================================================
   CONTENT TYPE
========================================================= */

const typeSelector =
  document.getElementById(
    'typeSelector'
  );


if (typeSelector) {

  typeSelector.addEventListener(
    'click',
    (e) => {

      const btn =
        e.target.closest(
          '.type-pill'
        );

      if (!btn) return;

      setType(
        btn.dataset.type
      );
    }
  );
}


function setType(type) {

  const selected =
    type ||
    'announcement';


  document
    .querySelectorAll(
      '.type-pill'
    )
    .forEach(pill => {

      pill.classList.toggle(
        'active',
        pill.dataset.type === selected
      );
    });


  const eventFields =
    document.getElementById(
      'eventFields'
    );


  if (eventFields) {

    eventFields.classList.toggle(
      'hidden',
      selected !== 'event'
    );
  }


  const form =
    document.getElementById(
      'publishForm'
    );


  if (form) {

    form.dataset.type =
      selected;
  }
}


/* =========================================================
   STATUS / SCHEDULE
========================================================= */

const fStatus =
  document.getElementById(
    'fStatus'
  );


if (fStatus) {

  fStatus.addEventListener(
    'change',
    toggleScheduledField
  );
}


function toggleScheduledField() {

  const status =
    document.getElementById(
      'fStatus'
    );


  const scheduledWrap =
    document.getElementById(
      'scheduledWrap'
    );


  if (
    !status ||
    !scheduledWrap
  ) {
    return;
  }


  scheduledWrap.classList.toggle(
    'hidden',
    status.value !== 'scheduled'
  );
}


/* =========================================================
   AUTO SLUG
========================================================= */

const fTitle =
  document.getElementById(
    'fTitle'
  );


if (fTitle) {

  fTitle.addEventListener(
    'input',
    (e) => {

      const slug =
        document.getElementById(
          'fSlug'
        );


      if (!slug) return;


      if (
        slug.dataset.userEdited
      ) {
        return;
      }


      slug.value =
        e.target.value
          .toLowerCase()
          .trim()
          .replace(
            /[^a-z0-9]+/g,
            '-'
          )
          .replace(
            /(^-|-$)/g,
            ''
          );
    }
  );
}


const fSlug =
  document.getElementById(
    'fSlug'
  );


if (fSlug) {

  fSlug.addEventListener(
    'input',
    (e) => {

      e.target.dataset.userEdited =
        '1';
    }
  );
}


/* =========================================================
   FORM CHANGE DETECTION
========================================================= */

const publishForm =
  document.getElementById(
    'publishForm'
  );


if (publishForm) {

  publishForm.addEventListener(
    'input',
    () => {

      hasUnsavedChanges =
        true;
    }
  );


  publishForm.addEventListener(
    'change',
    () => {

      hasUnsavedChanges =
        true;
    }
  );
}


/* =========================================================
   COVER IMAGE
========================================================= */

const coverDropzone =
  document.getElementById(
    'coverDropzone'
  );


const coverInput =
  document.getElementById(
    'coverInput'
  );


if (
  coverDropzone &&
  coverInput
) {

  coverDropzone.addEventListener(
    'click',
    (e) => {

      if (
        e.target.closest(
          '#coverReplace'
        ) ||
        e.target.closest(
          '#coverRemove'
        )
      ) {
        return;
      }


      if (!coverPath) {

        coverInput.click();
      }
    }
  );


  coverInput.addEventListener(
    'change',
    () => {

      if (
        coverInput.files &&
        coverInput.files[0]
      ) {

        handleCoverUpload(
          coverInput.files[0]
        );
      }
    }
  );


  ['dragover', 'dragleave', 'drop']
    .forEach(evt => {

      coverDropzone.addEventListener(
        evt,
        (e) => {

          e.preventDefault();


          coverDropzone.classList.toggle(
            'dragover',
            evt === 'dragover'
          );


          if (
            evt === 'drop' &&
            e.dataTransfer.files &&
            e.dataTransfer.files[0]
          ) {

            handleCoverUpload(
              e.dataTransfer.files[0]
            );
          }
        }
      );
    });
}


const coverReplace =
  document.getElementById(
    'coverReplace'
  );


if (coverReplace) {

  coverReplace.addEventListener(
    'click',
    (e) => {

      e.stopPropagation();

      if (coverInput) {
        coverInput.click();
      }
    }
  );
}


const coverRemove =
  document.getElementById(
    'coverRemove'
  );


if (coverRemove) {

  coverRemove.addEventListener(
    'click',
    (e) => {

      e.stopPropagation();

      coverPath = null;

      renderCover(null);

      hasUnsavedChanges =
        true;
    }
  );
}


async function handleCoverUpload(file) {

  try {

    if (
      !file.type.startsWith(
        'image/'
      )
    ) {

      toast(
        'Please select an image.',
        'error'
      );

      return;
    }


    toast(
      'Uploading cover image…',
      'info'
    );


    const data =
      await uploadFile(
        '/upload/image.php',
        file,
        'image'
      );


    coverPath =
      data.location;


    renderCover(
      coverPath
    );


    hasUnsavedChanges =
      true;


    toast(
      'Cover image uploaded.'
    );

  } catch (err) {

    toast(
      err.message ||
      'Cover upload failed.',
      'error'
    );
  }
}


function renderCover(path) {

  coverPath =
    path || null;


  const empty =
    document.getElementById(
      'coverEmpty'
    );


  const previewWrap =
    document.getElementById(
      'coverPreviewWrap'
    );


  const preview =
    document.getElementById(
      'coverPreview'
    );


  if (!empty || !previewWrap) {
    return;
  }


  empty.classList.toggle(
    'hidden',
    !!path
  );


  previewWrap.classList.toggle(
    'hidden',
    !path
  );


  if (
    path &&
    preview
  ) {

    preview.src =
      resolveUploadUrl(path);
  }
}


/* =========================================================
   GALLERY
========================================================= */

const galleryInput =
  document.getElementById(
    'galleryInput'
  );


if (galleryInput) {

  galleryInput.addEventListener(
    'change',
    async (e) => {

      const files =
        Array.from(
          e.target.files || []
        );


      for (const file of files) {

        try {

          if (
            !file.type.startsWith(
              'image/'
            )
          ) {

            toast(
              `${file.name}: Not an image.`,
              'error'
            );

            continue;
          }


          const data =
            await uploadFile(
              '/upload/image.php',
              file,
              'image'
            );


          galleryFiles.push(
            data.location
          );

        } catch (err) {

          toast(
            `${file.name}: ${err.message}`,
            'error'
          );
        }
      }


      renderGallery(
        galleryFiles
      );


      hasUnsavedChanges =
        true;


      e.target.value = '';
    }
  );
}


function renderGallery(paths) {

  galleryFiles =
    Array.isArray(paths)
      ? paths
      : [];


  const container =
    document.getElementById(
      'galleryPreview'
    );


  if (!container) return;


  container.innerHTML =
    galleryFiles.map(
      (path, index) => `

        <div class="gallery-thumb">

          <img
            src="${resolveUploadUrl(path)}"
            alt="Gallery image"
          >

          <button
            type="button"
            aria-label="Remove image"
            onclick="
              removeGalleryImage(${index})
            "
          >
            ✕
          </button>

        </div>

      `
    ).join('');
}


function removeGalleryImage(index) {

  if (
    index < 0 ||
    index >= galleryFiles.length
  ) {
    return;
  }


  galleryFiles.splice(
    index,
    1
  );


  renderGallery(
    galleryFiles
  );


  hasUnsavedChanges =
    true;
}


/* =========================================================
   ATTACHMENTS
========================================================= */

const attachmentInput =
  document.getElementById(
    'attachmentInput'
  );


if (attachmentInput) {

  attachmentInput.addEventListener(
    'change',
    async (e) => {

      const files =
        Array.from(
          e.target.files || []
        );


      for (const file of files) {

        try {

          const data =
            await uploadFile(
              '/upload/file.php',
              file,
              'file'
            );


          attachmentFiles.push(
            data
          );

        } catch (err) {

          toast(
            `${file.name}: ${err.message}`,
            'error'
          );
        }
      }


      renderAttachments(
        attachmentFiles
      );


      hasUnsavedChanges =
        true;


      e.target.value = '';
    }
  );
}


function fileIcon(type) {

  return {

    pdf: '📕',

    doc: '📘',

    docx: '📘',

    archive: '🗜️',

    zip: '🗜️',

    ppt: '📊',

    pptx: '📊',

    xls: '📗',

    xlsx: '📗'

  }[String(type || '').toLowerCase()]
    || '📄';
}


function renderAttachments(list) {

  attachmentFiles =
    Array.isArray(list)
      ? list
      : [];


  const container =
    document.getElementById(
      'attachmentList'
    );


  if (!container) return;


  container.innerHTML =
    attachmentFiles.map(
      (a, index) => `

        <div class="
          flex
          items-center
          justify-between
          bg-mist
          rounded-lg
          px-3
          py-2
          text-sm
          gap-3
        ">

          <span class="
            flex
            items-center
            gap-2
            min-w-0
          ">

            <span>
              ${fileIcon(a.file_type)}
            </span>

            <span
              class="truncate"
              title="${escapeHtml(a.file_name || '')}"
            >
              ${escapeHtml(a.file_name || 'File')}
            </span>

            <span class="
              text-xs
              text-ink-soft
              shrink-0
            ">
              ${
                a.file_size_human ||
                human(a.file_size)
              }
            </span>

          </span>


          <button
            type="button"
            class="
              text-red-600
              hover:text-red-800
              text-xs
              font-medium
              shrink-0
            "
            onclick="
              removeAttachment(${index})
            "
          >
            Remove
          </button>

        </div>

      `
    ).join('');
}


function removeAttachment(index) {

  if (
    index < 0 ||
    index >= attachmentFiles.length
  ) {
    return;
  }


  attachmentFiles.splice(
    index,
    1
  );


  renderAttachments(
    attachmentFiles
  );


  hasUnsavedChanges =
    true;
}


function human(bytes) {

  const units = [
    'B',
    'KB',
    'MB',
    'GB'
  ];


  let size =
    Number(bytes) || 0;


  let index = 0;


  while (
    size >= 1024 &&
    index < units.length - 1
  ) {

    size /= 1024;

    index++;
  }


  return `${size.toFixed(1)} ${units[index]}`;
}


/* =========================================================
   UPLOAD URL
========================================================= */

function resolveUploadUrl(path) {

  if (!path) {
    return '';
  }


  /*
   * API returns paths such as:
   * /uploads/images/example.jpg
   *
   * Admin is inside /admin/,
   * so ../ is required.
   */

  if (
    path.startsWith(
      'http://'
    ) ||
    path.startsWith(
      'https://'
    ) ||
    path.startsWith(
      'data:'
    )
  ) {

    return path;
  }


  return `..${path}`;
}


/* =========================================================
   SAVE / PUBLISH
========================================================= */

const saveDraftBtn =
  document.getElementById(
    'saveDraftBtn'
  );


if (saveDraftBtn) {

  saveDraftBtn.addEventListener(
    'click',
    () => savePost('draft')
  );
}


if (publishForm) {

  publishForm.addEventListener(
    'submit',
    (e) => {

      e.preventDefault();

      savePost();
    }
  );
}


async function savePost(
  forceStatus = null
) {

  const form =
    document.getElementById(
      'publishForm'
    );


  if (!form) return;


  const type =
    form.dataset.type ||
    'announcement';


  const title =
    document
      .getElementById('fTitle')
      ?.value
      .trim() || '';


  if (!title) {

    toast(
      'Title is required.',
      'error'
    );

    return;
  }


  const status =
    forceStatus ||
    document
      .getElementById('fStatus')
      ?.value ||
    'draft';


  const body =
    getEditorContent(
      '#fBody'
    );


  const payload = {

    id:
      editingPostId ||
      undefined,

    title,

    slug:
      document
        .getElementById('fSlug')
        ?.value
        .trim() || '',

    type,

    category:
      document
        .getElementById('fCategory')
        ?.value
        .trim() || '',

    author:
      document
        .getElementById('fAuthor')
        ?.value
        .trim() || '',

    status,

    scheduled_at:
      document
        .getElementById('fScheduledAt')
        ?.value || null,

    body_html:
      body,

    cover_image:
      coverPath,

    event_date:
      document
        .getElementById('fEventDate')
        ?.value || null,

    start_time:
      document
        .getElementById('fStartTime')
        ?.value || null,

    end_time:
      document
        .getElementById('fEndTime')
        ?.value || null,

    venue:
      document
        .getElementById('fVenue')
        ?.value
        .trim() || '',

    organizer:
      document
        .getElementById('fOrganizer')
        ?.value
        .trim() || '',

    meta_title:
      document
        .getElementById('fMetaTitle')
        ?.value
        .trim() || '',

    meta_description:
      document
        .getElementById('fMetaDescription')
        ?.value
        .trim() || '',

    gallery:
      galleryFiles,

    attachments:
      attachmentFiles

  };


  /*
   * Disable buttons during save.
   */
  const publishBtn =
    document.getElementById(
      'publishBtn'
    );


  if (saveDraftBtn) {
    saveDraftBtn.disabled = true;
  }


  if (publishBtn) {
    publishBtn.disabled = true;
  }


  try {

    const endpoint =
      editingPostId
        ? '/posts/update.php'
        : '/posts/create.php';


    const data =
      await apiCall(
        endpoint,
        {
          method: 'POST',
          body: payload
        }
      );


    editingPostId =
      data.id ||
      editingPostId;


    hasUnsavedChanges =
      false;


    clearLocalDraft();


    toast(
      status === 'draft'
        ? 'Draft saved.'
        : status === 'scheduled'
          ? 'Post scheduled.'
          : 'Post published.'
    );


    stopAutosave();


    /*
     * Return to posts list.
     */
    currentFilter = {
      view: 'posts',
      type: '',
      status: ''
    };


    /*
     * Activate Posts sidebar button.
     */
    activateSidebarItem(
      'posts',
      '',
      ''
    );


    showView('posts');


    await Promise.all([
      loadPosts(),
      loadDashboardStats()
    ]);

  } catch (err) {

    toast(
      err.message ||
      'Could not save post.',
      'error'
    );

  } finally {

    if (saveDraftBtn) {
      saveDraftBtn.disabled = false;
    }

    if (publishBtn) {
      publishBtn.disabled = false;
    }
  }
}


/* =========================================================
   ACTIVATE SIDEBAR ITEM
========================================================= */

function activateSidebarItem(
  view,
  type = '',
  status = ''
) {

  document
    .querySelectorAll(
      '#sidebarNav .nav-item'
    )
    .forEach(btn => {

      const matches =
        btn.dataset.view === view &&
        (btn.dataset.type || '') === type &&
        (btn.dataset.status || '') === status;


      btn.classList.toggle(
        'active',
        matches
      );
    });
}


/* =========================================================
   EDIT POST
========================================================= */

async function editPost(id) {

  try {

    const post =
      await apiCall(
        `/posts/single.php?id=${id}&scope=admin`
      );


    openEditor(
      'edit',
      post
    );

  } catch (err) {

    toast(
      err.message ||
      'Could not open post.',
      'error'
    );
  }
}


/* =========================================================
   KEYBOARD SHORTCUTS
========================================================= */

document.addEventListener(
  'keydown',
  (e) => {

    const editor =
      document.getElementById(
        'view-editor'
      );


    /*
     * Only run editor shortcuts
     * while full-page editor is open.
     */
    if (
      !editor ||
      editor.classList.contains(
        'hidden'
      )
    ) {
      return;
    }


    if (
      (e.ctrlKey || e.metaKey) &&
      e.key.toLowerCase() === 's'
    ) {

      e.preventDefault();

      savePost('draft');

      return;
    }


    if (
      (e.ctrlKey || e.metaKey) &&
      e.shiftKey &&
      e.key.toLowerCase() === 'p'
    ) {

      e.preventDefault();

      savePost('published');

      return;
    }


    /*
     * Escape returns to Posts.
     */
    if (
      e.key === 'Escape'
    ) {

      e.preventDefault();

      leaveEditor();
    }
  }
);


/* =========================================================
   LEAVE EDITOR
========================================================= */

function leaveEditor() {

  if (hasUnsavedChanges) {

    const leave =
      confirm(
        'You have unsaved changes. Leave this page?'
      );

    if (!leave) {
      return;
    }
  }


  stopAutosave();

  hasUnsavedChanges =
    false;


  currentFilter = {
    view: 'posts',
    type: '',
    status: ''
  };


  activateSidebarItem(
    'posts',
    '',
    ''
  );


  showView(
    'posts'
  );


  loadPosts();
}


/* =========================================================
   BROWSER CLOSE WARNING
========================================================= */

window.addEventListener(
  'beforeunload',
  (e) => {

    if (!hasUnsavedChanges) {
      return;
    }


    e.preventDefault();

    e.returnValue = '';
  }
);


/* =========================================================
   AUTOSAVE
========================================================= */

function localDraftKey() {

  return `hperd_draft_${
    editingPostId || 'new'
  }`;
}


function startAutosave() {

  stopAutosave();


  autosaveTimer =
    setInterval(
      () => {

        if (!hasUnsavedChanges) {
          return;
        }


        const title =
          document
            .getElementById('fTitle')
            ?.value || '';


        const snapshot = {

          title,

          body_html:
            getEditorContent(
              '#fBody'
            ),

          savedAt:
            new Date().toISOString()

        };


        try {

          localStorage.setItem(
            localDraftKey(),
            JSON.stringify(
              snapshot
            )
          );


          const indicator =
            document.getElementById(
              'autosaveIndicator'
            );


          if (indicator) {

            indicator.textContent =
              'Autosaved locally ' +
              new Date()
                .toLocaleTimeString();
          }

        } catch (err) {

          console.warn(
            'Local autosave failed:',
            err
          );
        }

      },
      30000
    );
}


function stopAutosave() {

  if (autosaveTimer) {

    clearInterval(
      autosaveTimer
    );

    autosaveTimer = null;
  }


  const indicator =
    document.getElementById(
      'autosaveIndicator'
    );


  if (indicator) {

    indicator.textContent =
      '';
  }
}


function clearLocalDraft() {

  try {

    localStorage.removeItem(
      localDraftKey()
    );

  } catch {
    // Ignore storage errors.
  }
}


function maybeOfferLocalDraft() {

  let raw = null;


  try {

    raw =
      localStorage.getItem(
        localDraftKey()
      );

  } catch {

    return;
  }


  if (!raw) {
    return;
  }


  try {

    const snapshot =
      JSON.parse(raw);


    if (
      !snapshot ||
      !snapshot.savedAt
    ) {
      return;
    }


    const restore =
      confirm(
        `A locally autosaved draft from ${
          new Date(
            snapshot.savedAt
          ).toLocaleString()
        } was found. Restore it?`
      );


    if (!restore) {
      return;
    }


    const title =
      document.getElementById(
        'fTitle'
      );


    if (title) {

      title.value =
        snapshot.title ||
        title.value;
    }


    setEditorContent(
      '#fBody',
      snapshot.body_html || ''
    );


    hasUnsavedChanges =
      true;

  } catch {

    // Ignore malformed local draft.
  }
}


/* =========================================================
   MEDIA LIBRARY
========================================================= */

const mediaSearch =
  document.getElementById(
    'mediaSearch'
  );


if (mediaSearch) {

  mediaSearch.addEventListener(
    'input',
    () => {

      clearTimeout(
        mediaSearchDebounce
      );


      mediaSearchDebounce =
        setTimeout(
          loadMedia,
          350
        );
    }
  );
}


const mediaTypeFilter =
  document.getElementById(
    'mediaTypeFilter'
  );


if (mediaTypeFilter) {

  mediaTypeFilter.addEventListener(
    'change',
    loadMedia
  );
}


const mediaUploadInput =
  document.getElementById(
    'mediaUploadInput'
  );


if (mediaUploadInput) {

  mediaUploadInput.addEventListener(
    'change',
    async (e) => {

      const files =
        Array.from(
          e.target.files || []
        );


      for (const file of files) {

        try {

          const isImage =
            file.type.startsWith(
              'image/'
            );


          await uploadFile(
            isImage
              ? '/upload/image.php'
              : '/upload/file.php',

            file,

            isImage
              ? 'image'
              : 'file'
          );

        } catch (err) {

          toast(
            `${file.name}: ${err.message}`,
            'error'
          );
        }
      }


      if (files.length) {

        toast(
          'Upload complete.'
        );
      }


      loadMedia();


      e.target.value = '';
    }
  );
}


async function loadMedia() {

  const grid =
    document.getElementById(
      'mediaGrid'
    );


  if (!grid) {
    return;
  }


  grid.innerHTML =
    skeletonRows(
      5,
      'h-32'
    );


  try {

    const type =
      document
        .getElementById(
          'mediaTypeFilter'
        )
        ?.value ||
      'all';


    const search =
      document
        .getElementById(
          'mediaSearch'
        )
        ?.value
        .trim() ||
      '';


    const params =
      new URLSearchParams({
        type,
        search
      });


    const data =
      await apiCall(
        `/media/list.php?${params.toString()}`
      );


    const files =
      Array.isArray(data.files)
        ? data.files
        : [];


    grid.innerHTML =
      files.length

        ? files
            .map(mediaTileHtml)
            .join('')

        : `
          <p class="
            col-span-full
            text-center
            text-ink-soft
            text-sm
            py-8
          ">
            No files yet — click Upload
            to add some.
          </p>
        `;

  } catch (err) {

    toast(
      err.message ||
      'Could not load media.',
      'error'
    );
  }
}


/* =========================================================
   MEDIA TILE
========================================================= */

function mediaTileHtml(f) {

  const preview =
    f.file_type === 'image'

      ? `
        <img
          src="${resolveUploadUrl(f.file_path)}"
          class="
            w-full
            h-24
            object-cover
          "
          alt="${escapeHtml(f.file_name || '')}"
        >
      `

      : `
        <div class="
          w-full
          h-24
          bg-mist
          flex
          items-center
          justify-center
          text-3xl
        ">
          ${fileIcon(f.file_type)}
        </div>
      `;


  const fileName =
    escapeHtml(
      f.file_name || 'File'
    );


  const path =
    resolveUploadUrl(
      f.file_path
    );


  const safePath =
    path
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "\\'");


  return `

    <div class="media-tile">

      ${preview}


      <div class="p-2.5">

        <p
          class="
            text-xs
            font-medium
            text-navy
            truncate
          "
          title="${fileName}"
        >
          ${fileName}
        </p>


        <p class="
          text-[11px]
          text-ink-soft
          mt-0.5
        ">
          ${escapeHtml(
            f.file_size_human || ''
          )}
        </p>


        <div class="
          flex
          justify-between
          mt-2
        ">

          <button
            class="
              text-[11px]
              text-teal
              font-medium
            "
            onclick="
              copyMediaUrl('${safePath}')
            "
          >
            Copy URL
          </button>


          <button
            class="
              text-[11px]
              text-red-600
              font-medium
            "
            onclick="
              deleteMedia(${Number(f.id)})
            "
          >
            Delete
          </button>

        </div>

      </div>

    </div>
  `;
}


/* =========================================================
   COPY MEDIA URL
========================================================= */

async function copyMediaUrl(url) {

  try {

    const absolute =
      new URL(
        url,
        window.location.href
      ).href;


    await navigator.clipboard.writeText(
      absolute
    );


    toast(
      'URL copied.'
    );

  } catch {

    toast(
      'Could not copy URL.',
      'error'
    );
  }
}


/* =========================================================
   DELETE MEDIA
========================================================= */

async function deleteMedia(id) {

  const ok =
    await confirmModal({

      title:
        'Delete this file?',

      message:
        'This cannot be undone.'

    });


  if (!ok) {
    return;
  }


  try {

    await apiCall(
      '/media/delete.php',
      {
        method: 'POST',
        body: { id }
      }
    );


    toast(
      'File deleted.'
    );


    loadMedia();

  } catch (err) {

    toast(
      err.message ||
      'Could not delete file.',
      'error'
    );
  }
}


/* =========================================================
   INITIAL EDITOR BUTTON STATE
========================================================= */

document.addEventListener(
  'DOMContentLoaded',
  () => {

    /*
     * Make sure New is enabled initially.
     */
    updateNewButtonState(
      'dashboard'
    );
  }
);
