import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CultiveComponent } from './cultive.component';

describe('CultiveComponent', () => {
  let component: CultiveComponent;
  let fixture: ComponentFixture<CultiveComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CultiveComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CultiveComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
