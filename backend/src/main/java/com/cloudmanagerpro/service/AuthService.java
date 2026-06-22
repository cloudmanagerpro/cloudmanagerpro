package com.cloudmanagerpro.service;

import com.cloudmanagerpro.config.AppProperties;
import com.cloudmanagerpro.dto.auth.AuthResponse;
import com.cloudmanagerpro.dto.auth.LoginRequest;
import com.cloudmanagerpro.dto.auth.SignupRequest;
import com.cloudmanagerpro.dto.auth.UserDto;
import com.cloudmanagerpro.exception.DuplicateResourceException;
import com.cloudmanagerpro.exception.ResourceNotFoundException;
import com.cloudmanagerpro.exception.UnauthorizedException;
import com.cloudmanagerpro.model.User;
import com.cloudmanagerpro.model.enums.Role;
import com.cloudmanagerpro.repository.UserRepository;
import com.cloudmanagerpro.security.CurrentUser;
import com.cloudmanagerpro.security.JwtService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;
    private final CurrentUser currentUser;
    private final AppProperties properties;
    private final ObjectProvider<DemoSeeder> demoSeederProvider;

    public AuthService(UserRepository userRepository,
                       PasswordEncoder passwordEncoder,
                       JwtService jwtService,
                       AuthenticationManager authenticationManager,
                       CurrentUser currentUser,
                       AppProperties properties,
                       ObjectProvider<DemoSeeder> demoSeederProvider) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.authenticationManager = authenticationManager;
        this.currentUser = currentUser;
        this.properties = properties;
        this.demoSeederProvider = demoSeederProvider;
    }

    @Transactional
    public AuthResponse signup(SignupRequest request) {
        String email = request.email().trim().toLowerCase();
        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw new DuplicateResourceException("An account with this email already exists");
        }
        User user = new User();
        user.setEmail(email);
        user.setName(request.name().trim());
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setRole(Role.USER);
        User saved = userRepository.save(user);

        seedDemoData(saved);

        String token = jwtService.generateToken(saved);
        return new AuthResponse(token, UserDto.from(saved));
    }

    public AuthResponse login(LoginRequest request) {
        String email = request.email().trim().toLowerCase();
        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(email, request.password()));
        } catch (BadCredentialsException ex) {
            throw new UnauthorizedException("Invalid email or password");
        }
        User user = userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new UnauthorizedException("Invalid email or password"));
        String token = jwtService.generateToken(user);
        return new AuthResponse(token, UserDto.from(user));
    }

    @Transactional(readOnly = true)
    public UserDto me() {
        User user = userRepository.findById(currentUser.id())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        return UserDto.from(user);
    }

    private void seedDemoData(User user) {
        if (!properties.getDemo().isEnabled()) {
            return;
        }
        DemoSeeder seeder = demoSeederProvider.getIfAvailable();
        if (seeder == null) {
            return;
        }
        try {
            seeder.seedForNewUser(user);
        } catch (Exception ex) {
            log.warn("Demo data seeding failed for user {}: {}", user.getId(), ex.getMessage());
        }
    }
}
