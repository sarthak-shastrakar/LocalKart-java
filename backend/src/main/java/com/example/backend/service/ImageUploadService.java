package com.example.backend.service;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import com.example.backend.dto.response.UploadResponse;
import com.example.backend.exception.ApiException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;

@Service
public class ImageUploadService {

    private static final long MAX_BYTES = 10L * 1024 * 1024;

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
}