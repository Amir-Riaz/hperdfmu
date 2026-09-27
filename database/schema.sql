-- ==========================================================================
-- HPERD Admin CMS — Complete Database Schema
-- Health Professions Education & Research Department, FMU
-- ==========================================================================

-- WARNING:
-- This deletes the existing database and all data inside it.
-- Remove the DROP DATABASE line if you need to preserve existing data.

DROP DATABASE IF EXISTS hperd_cms;

CREATE DATABASE hperd_cms
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE hperd_cms;


-- ==========================================================================
-- ADMIN USERS
-- ==========================================================================

CREATE TABLE admin_users (
    id              INT UNSIGNED NOT NULL AUTO_INCREMENT,
    email           VARCHAR(190) NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    display_name    VARCHAR(150) DEFAULT NULL,
    role            ENUM('admin', 'editor') NOT NULL DEFAULT 'editor',
    is_active       TINYINT(1) NOT NULL DEFAULT 1,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY uq_admin_users_email (email),
    KEY idx_admin_users_active (is_active)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;


-- ==========================================================================
-- POSTS
-- Universal content table:
-- Event / Announcement / Notice
-- ==========================================================================

CREATE TABLE posts (
    id                  INT UNSIGNED NOT NULL AUTO_INCREMENT,
    title               VARCHAR(255) NOT NULL,
    slug                VARCHAR(255) NOT NULL,

    type                ENUM(
                            'event',
                            'announcement',
                            'notice'
                        ) NOT NULL DEFAULT 'announcement',

    category            VARCHAR(100) DEFAULT NULL,
    author              VARCHAR(150) DEFAULT NULL,

    status              ENUM(
                            'draft',
                            'published',
                            'scheduled'
                        ) NOT NULL DEFAULT 'draft',

    scheduled_at        DATETIME DEFAULT NULL,

    body_html           LONGTEXT DEFAULT NULL,
    cover_image         VARCHAR(500) DEFAULT NULL,

    -- Event fields
    event_date         DATE DEFAULT NULL,
    start_time         TIME DEFAULT NULL,
    end_time           TIME DEFAULT NULL,
    venue              VARCHAR(255) DEFAULT NULL,
    organizer          VARCHAR(255) DEFAULT NULL,

    -- SEO
    meta_title         VARCHAR(255) DEFAULT NULL,
    meta_description   VARCHAR(500) DEFAULT NULL,

    -- Statistics
    views              INT UNSIGNED NOT NULL DEFAULT 0,

    -- Author/admin who created the post
    created_by         INT UNSIGNED DEFAULT NULL,

    created_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                       ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    UNIQUE KEY uq_posts_slug (slug),

    KEY idx_posts_type_status (type, status),
    KEY idx_posts_event_date (event_date),
    KEY idx_posts_status (status),
    KEY idx_posts_created_at (created_at),
    KEY idx_posts_created_by (created_by),

    CONSTRAINT fk_posts_created_by
        FOREIGN KEY (created_by)
        REFERENCES admin_users (id)
        ON DELETE SET NULL
        ON UPDATE CASCADE

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;


-- ==========================================================================
-- POST IMAGES
-- Gallery images attached to posts
-- ==========================================================================

CREATE TABLE post_images (
    id              INT UNSIGNED NOT NULL AUTO_INCREMENT,
    post_id         INT UNSIGNED NOT NULL,
    image_path      VARCHAR(500) NOT NULL,
    sort_order      INT UNSIGNED NOT NULL DEFAULT 0,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    KEY idx_post_images_post_id (post_id),
    KEY idx_post_images_sort (post_id, sort_order),

    CONSTRAINT fk_post_images_post
        FOREIGN KEY (post_id)
        REFERENCES posts (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;


-- ==========================================================================
-- ATTACHMENTS
-- Downloadable files attached to posts
-- ==========================================================================

CREATE TABLE attachments (
    id              INT UNSIGNED NOT NULL AUTO_INCREMENT,
    post_id         INT UNSIGNED NOT NULL,

    file_name       VARCHAR(255) NOT NULL,
    file_path       VARCHAR(500) NOT NULL,
    file_size       INT UNSIGNED NOT NULL DEFAULT 0,
    file_type       VARCHAR(100) NOT NULL,

    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    KEY idx_attachments_post_id (post_id),

    CONSTRAINT fk_attachments_post
        FOREIGN KEY (post_id)
        REFERENCES posts (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;


-- ==========================================================================
-- MEDIA LIBRARY
-- Independent media/files uploaded through Media Library
-- ==========================================================================

CREATE TABLE media_library (
    id              INT UNSIGNED NOT NULL AUTO_INCREMENT,

    file_name       VARCHAR(255) NOT NULL,
    file_path       VARCHAR(500) NOT NULL,

    -- image / pdf / doc / other
    file_type       VARCHAR(50) NOT NULL,

    mime_type       VARCHAR(100) NOT NULL,

    file_size       INT UNSIGNED NOT NULL DEFAULT 0,

    uploaded_by     INT UNSIGNED DEFAULT NULL,

    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    KEY idx_media_file_type (file_type),
    KEY idx_media_uploaded_by (uploaded_by),
    KEY idx_media_created_at (created_at),

    CONSTRAINT fk_media_uploaded_by
        FOREIGN KEY (uploaded_by)
        REFERENCES admin_users (id)
        ON DELETE SET NULL
        ON UPDATE CASCADE

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;


-- ==========================================================================
-- OPTIONAL: POST VIEWS
-- Keeps individual view records if analytics are required.
-- ==========================================================================

CREATE TABLE post_views (
    id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    post_id         INT UNSIGNED NOT NULL,

    ip_address      VARCHAR(45) DEFAULT NULL,
    user_agent      VARCHAR(500) DEFAULT NULL,

    viewed_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    KEY idx_post_views_post_id (post_id),
    KEY idx_post_views_viewed_at (viewed_at),

    CONSTRAINT fk_post_views_post
        FOREIGN KEY (post_id)
        REFERENCES posts (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;


-- ==========================================================================
-- OPTIONAL: CONTACT / INQUIRIES
-- Useful if the website has a contact form.
-- ==========================================================================

CREATE TABLE contact_messages (
    id              INT UNSIGNED NOT NULL AUTO_INCREMENT,

    name            VARCHAR(150) NOT NULL,
    email           VARCHAR(190) NOT NULL,
    phone           VARCHAR(50) DEFAULT NULL,
    subject         VARCHAR(255) DEFAULT NULL,
    message         TEXT NOT NULL,

    status          ENUM(
                        'new',
                        'read',
                        'replied',
                        'archived'
                    ) NOT NULL DEFAULT 'new',

    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                    ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    KEY idx_contact_status (status),
    KEY idx_contact_created_at (created_at)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;


-- ==========================================================================
-- OPTIONAL: SITE SETTINGS
-- Stores editable CMS settings.
-- ==========================================================================

CREATE TABLE site_settings (
    id              INT UNSIGNED NOT NULL AUTO_INCREMENT,

    setting_key     VARCHAR(100) NOT NULL,
    setting_value   LONGTEXT DEFAULT NULL,

    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                    ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    UNIQUE KEY uq_site_settings_key (setting_key)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;


-- ==========================================================================
-- OPTIONAL DEFAULT SITE SETTINGS
-- ==========================================================================

INSERT INTO site_settings
    (setting_key, setting_value)
VALUES
    ('site_name', 'Health Professions Education & Research Department'),
    ('site_short_name', 'HPERD'),
    ('site_description', 'Health Professions Education & Research Department, FMU'),
    ('contact_email', ''),
    ('contact_phone', ''),
    ('address', '')
;


-- ==========================================================================
-- VERIFY TABLES
-- ==========================================================================

SHOW TABLES;
