<?php
require_once __DIR__ . '/../config/config.php';

/** Turns a title into a URL-safe, unique slug (appends -2, -3, ... on collision). */
function generate_slug(string $title, ?int $ignorePostId = null): string
{
    $base = strtolower(trim($title));
    $base = preg_replace('/[^a-z0-9]+/', '-', $base);
    $base = trim($base, '-');
    if ($base === '') {
        $base = 'post';
    }

    $slug = $base;
    $i = 2;
    while (slug_exists($slug, $ignorePostId)) {
        $slug = $base . '-' . $i;
        $i++;
    }
    return $slug;
}

function slug_exists(string $slug, ?int $ignorePostId = null): bool
{
    $sql = 'SELECT id FROM posts WHERE slug = :slug';
    $params = ['slug' => $slug];
    if ($ignorePostId !== null) {
        $sql .= ' AND id != :id';
        $params['id'] = $ignorePostId;
    }
    $stmt = db()->prepare($sql);
    $stmt->execute($params);
    return (bool) $stmt->fetch();
}

/**
 * Strips dangerous tags/attributes from TinyMCE's output while preserving the
 * formatting tags the editor produces (headings, lists, tables, links, images...).
 * This is a pragmatic allow-list sanitizer; for very high-security deployments,
 * consider running content through HTML Purifier instead.
 */
function sanitize_rich_html(string $html): string
{
    // Strip script/style/iframe/object/embed blocks entirely.
    $html = preg_replace('#<(script|style|iframe|object|embed)\b[^>]*>.*?</\1>#is', '', $html);

    // Strip on* event-handler attributes and javascript: URIs.
    $html = preg_replace('/\son\w+\s*=\s*"[^"]*"/i', '', $html);
    $html = preg_replace("/\son\w+\s*=\s*'[^']*'/i", '', $html);
    $html = preg_replace('/(href|src)\s*=\s*"javascript:[^"]*"/i', '$1="#"', $html);

    return $html;
}

/** Generates a collision-safe filename for an uploaded file, preserving its extension. */
function unique_filename(string $originalName): string
{
    $ext = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));
    $ext = preg_replace('/[^a-z0-9]/', '', $ext);
    $base = bin2hex(random_bytes(12));
    return $ext !== '' ? "{$base}.{$ext}" : $base;
}

function human_file_size(int $bytes): string
{
    $units = ['B', 'KB', 'MB', 'GB'];
    $i = 0;
    $size = $bytes;
    while ($size >= 1024 && $i < count($units) - 1) {
        $size /= 1024;
        $i++;
    }
    return round($size, $size < 10 ? 1 : 0) . ' ' . $units[$i];
}

function classify_file_type(string $mime): string
{
    if (str_starts_with($mime, 'image/')) return 'image';
    if ($mime === 'application/pdf') return 'pdf';
    if (str_contains($mime, 'word')) return 'doc';
    if (str_contains($mime, 'presentation') || str_contains($mime, 'powerpoint')) return 'doc';
    if (str_contains($mime, 'sheet') || str_contains($mime, 'excel')) return 'doc';
    if (str_contains($mime, 'zip')) return 'archive';
    return 'other';
}
