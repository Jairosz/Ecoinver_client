import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CropDistributionMapComponent } from './crop-distribution-map.component';

describe('CropDistributionMapComponent', () => {
  let component: CropDistributionMapComponent;
  let fixture: ComponentFixture<CropDistributionMapComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CropDistributionMapComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CropDistributionMapComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
