import { TestBed } from '@angular/core/testing';

import { KnowledgeMapDataService } from './knowledge-map-data.service';

describe('KnowledgeMapDataService', () => {
  let service: KnowledgeMapDataService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(KnowledgeMapDataService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
