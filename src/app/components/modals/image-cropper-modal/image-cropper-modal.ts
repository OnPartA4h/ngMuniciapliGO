import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { ImageCroppedEvent, ImageCropperComponent } from 'ngx-image-cropper';

@Component({
  selector: 'app-image-cropper-modal',
  standalone: true,
  imports: [CommonModule, TranslateModule, ImageCropperComponent],
  templateUrl: './image-cropper-modal.html',
  styleUrl: './image-cropper-modal.css',
})
export class ImageCropperModal {
  @Input() imageChangedEvent: Event | null = null;
  @Input() isUploading = false;
  
  @Output() cropCancelled = new EventEmitter<void>();
  @Output() imageUploaded = new EventEmitter<Blob>();
  @Output() cropperError = new EventEmitter<string>();

  croppedImage: Blob | null = null;

  imageCropped(event: ImageCroppedEvent) {
    if (event.blob) {
      this.croppedImage = event.blob;
      console.log('Image cropped, blob available:', !!event.blob);
    }
  }

  imageLoaded() {
    // Image loaded successfully
    console.log('Image loaded successfully');
  }

  cropperReady() {
    // Cropper is ready
    console.log('Cropper ready');
  }

  loadImageFailed() {
    console.error('Failed to load image');
    this.cropperError.emit('PROFILE.PHOTO_ERROR');
    this.cancel();
  }

  cancel() {
    // Ne pas permettre l'annulation pendant le téléchargement
    if (!this.isUploading) {
      this.cropCancelled.emit();
    }
  }

  upload() {
    if (this.croppedImage) {
      this.imageUploaded.emit(this.croppedImage);
    }
  }
}
