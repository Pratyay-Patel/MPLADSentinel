package com.mpladsentinel.inspection;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * {@code GET /api/officers} — the field officers an authority can assign an
 * inspection to. Any government role may read it (access enforced in
 * {@code SecurityConfig}).
 */
@RestController
@RequestMapping("/api/officers")
public class FieldOfficerController {

    private final FieldOfficerService service;

    public FieldOfficerController(FieldOfficerService service) {
        this.service = service;
    }

    @GetMapping
    public List<FieldOfficerResponse> list() {
        return service.listOfficers();
    }
}
