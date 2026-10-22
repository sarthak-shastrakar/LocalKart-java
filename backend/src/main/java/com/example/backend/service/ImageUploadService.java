package com.example.backend.service;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import com.example.backend.dto.response.UploadResponse;
import com.example.backend.exception.ApiException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.util.Collection;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.util.Map;

@Service
public class ImageUploadService {

    private static final long MAX_BYTES = 10L * 1024 * 1024;
    private static final Logger log = LoggerFactory.getLogger(ImageUploadService.class);

    private final Cloudinary cloudinary;
    private final String cloudName;

    public ImageUploadService(Cloudinary cloudinary,
            @Value("${cloudinary.cloud-name}") String cloudName) {
        this.cloudinary = cloudinary;
        this.cloudName = cloudName;
    }

    // sirf hamare Cloudinary ki image URL allowed, koi random link nahi
    public boolean isOurImage(String url) {
        return url != null && url.startsWith("https://res.cloudinary.com/" + cloudName + "/");
    }

    public UploadResponse upload(MultipartFile file, String type) {
        if (file == null || file.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Please choose an image");
        }
        if (file.getSize() > MAX_BYTES) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Image must be 10 MB or smaller");
        }

        byte[] bytes;
        try {
            bytes = file.getBytes();
        } catch (IOException e) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Could not read the file");
        }

        // header pe bharosa nahi, asli file ke pehle bytes check karte hain
        if (!isSupportedImage(bytes)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Only JPG, PNG or WEBP images are allowed");
        }

        String folder;
        if ("store".equals(type)) {
            folder = "localkart/stores";
        } else if ("profile".equals(type)) {
            folder = "localkart/profiles";
        } else if ("product".equals(type)) {
            folder = "localkart/products";
        } else {
            throw new ApiException(HttpStatus.BAD_REQUEST, "type must be store, product or profile");
        }

        try {
            Map<?, ?> result = cloudinary.uploader().upload(bytes, ObjectUtils.asMap(
                    "folder", folder,
                    "resource_type", "image"));
            return new UploadResponse((String) result.get("secure_url"),
                    (String) result.get("public_id"));
        } catch (Exception e) {
            throw new ApiException(HttpStatus.BAD_GATEWAY, "Cloudinary upload failed: " + e.getMessage());
        }
    }

    private boolean isSupportedImage(byte[] b) {
        if (b.length < 12)
            return false;
        boolean jpeg = (b[0] & 0xFF) == 0xFF && (b[1] & 0xFF) == 0xD8 && (b[2] & 0xFF) == 0xFF;
        boolean png = (b[0] & 0xFF) == 0x89 && b[1] == 0x50 && b[2] == 0x4E && b[3] == 0x47;
        boolean webp = b[0] == 'R' && b[1] == 'I' && b[2] == 'F' && b[3] == 'F'
                && b[8] == 'W' && b[9] == 'E' && b[10] == 'B' && b[11] == 'P';
        return jpeg || png || webp;
    }

    // URL se Cloudinary public id, sirf hamare "localkart/" folder ki images ke
    // liye
    public String publicIdFromUrl(String url) {
        if (!isOurImage(url))
            return null;
        int i = url.indexOf("/upload/");
        if (i < 0)
            return null;
        String rest = url.substring(i + "/upload/".length());
        int q = rest.indexOf('?');
        if (q >= 0)
            rest = rest.substring(0, q);
        rest = rest.replaceFirst("^v\\d+/", ""); // version hatao
        int dot = rest.lastIndexOf('.');
        if (dot > rest.lastIndexOf('/'))
            rest = rest.substring(0, dot); // extension hatao
        return rest.startsWith("localkart/") ? rest : null;
    }

    // best-effort: ek fail ho to baaki chalte rahein, exception bahar nahi jata
    public void deleteQuietly(Collection<String> urls) {
        for (String url : urls) {
            String publicId = publicIdFromUrl(url);
            if (publicId == null)
                continue;
            try {
                cloudinary.uploader().destroy(publicId, ObjectUtils.asMap(
                        "resource_type", "image",
                        "invalidate", true));
            } catch (Exception e) {
                log.warn("Could not delete Cloudinary image {}: {}", publicId, e.getMessage());
            }
        }
    }

    // DB commit ke BAAD hi Cloudinary se hatao, taaki save fail ho to images na
    // udein
    public void deleteAfterCommit(Collection<String> urls) {
        if (urls == null || urls.isEmpty())
            return;
        List<String> copy = List.copyOf(urls);
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    deleteQuietly(copy);
                }
            });
        } else {
            deleteQuietly(copy);
        }
    }
}