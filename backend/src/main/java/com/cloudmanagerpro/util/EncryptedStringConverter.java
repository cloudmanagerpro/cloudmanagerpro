package com.cloudmanagerpro.util;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

/**
 * Transparently encrypts {@code String} attributes (e.g. cloud credentials, Slack webhooks)
 * before they hit the database and decrypts them on read. The ciphertext column therefore
 * never contains plaintext secrets.
 */
@Converter
public class EncryptedStringConverter implements AttributeConverter<String, String> {

    @Override
    public String convertToDatabaseColumn(String attribute) {
        if (attribute == null || attribute.isEmpty()) {
            return attribute;
        }
        EncryptionService service = EncryptionService.getInstance();
        return service != null ? service.encrypt(attribute) : attribute;
    }

    @Override
    public String convertToEntityAttribute(String dbData) {
        if (dbData == null || dbData.isEmpty()) {
            return dbData;
        }
        EncryptionService service = EncryptionService.getInstance();
        return service != null ? service.decrypt(dbData) : dbData;
    }
}
