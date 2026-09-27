// HPERD CMS — TinyMCE setup.

async function initEditor(selector) {
  await tinymce.init({
    selector,
    height: 460,
    menubar: false,
    branding: false,
    plugins: [
      'lists', 'table', 'image', 'link', 'media', 'code', 'fullscreen',
      'autoresize', 'searchreplace', 'wordcount', 'hr',
    ],
    toolbar:
      'undo redo | blocks | bold italic underline strikethrough | ' +
      'alignleft aligncenter alignright | bullist numlist | ' +
      'link image media table blockquote hr | code fullscreen',
    block_formats: 'Paragraph=p; Heading 2=h2; Heading 3=h3; Heading 4=h4; Quote=blockquote',
    autoresize_bottom_margin: 24,
    content_style: `
      body { font-family: Inter, sans-serif; font-size: 15px; color: #1A2733; line-height: 1.65; }
      img { max-width: 100%; height: auto; border-radius: 10px; }
      blockquote { border-left: 3px solid #D4A017; margin-left: 0; padding-left: 1rem; color: #4B5B68; }
      table { border-collapse: collapse; width: 100%; }
      table td, table th { border: 1px solid #e2e8f0; padding: 6px 10px; }
    `,
    paste_data_images: false,
    // Drag-and-drop / paste / toolbar image insertion all route through here.
    images_upload_handler: (blobInfo) =>
      new Promise(async (resolve, reject) => {
        try {
          const data = await uploadFile('/upload/image.php', blobInfo.blob(), 'image');
          resolve(data.location || data.url);
        } catch (err) {
          reject({ message: err.message || 'Image upload failed', remove: true });
        }
      }),
  });
}

function getEditorContent(selector) {
  const ed = tinymce.get(selector.replace('#', ''));
  return ed ? ed.getContent() : '';
}

function setEditorContent(selector, html) {
  const ed = tinymce.get(selector.replace('#', ''));
  if (ed) ed.setContent(html || '');
}

function destroyEditor(selector) {
  tinymce.execCommand('mceRemoveEditor', false, selector.replace('#', ''));
}
