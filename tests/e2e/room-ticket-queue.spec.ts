import { test, expect } from '@playwright/test';

import { createRoomWithParticipant } from './helpers/room-journeys';

test.describe('Ticket Queue E2E', () => {
    test('should display Next Ticket and Open Queue buttons for moderator', async ({
        browser,
    }) => {
        const setup = await createRoomWithParticipant(browser);
        const { moderatorRoom, cleanup } = setup;

        try {
            const page = moderatorRoom.getPage();

            // Next Ticket should be visible to moderator
            await expect(page.getByTestId('next-ticket-button')).toBeVisible();

            // Open Queue should always be visible
            await expect(page.getByTestId('view-queue-button')).toBeVisible();
        } finally {
            await cleanup();
        }
    });

    test('should create auto-increment ticket on first Next Ticket click', async ({
        browser,
    }) => {
        const setup = await createRoomWithParticipant(browser);
        const { moderatorRoom, cleanup } = setup;

        try {
            const page = moderatorRoom.getPage();

            // Click Next Ticket
            await page.getByTestId('next-ticket-button').click();

            // Wait for WebSocket update
            await page.waitForTimeout(500);

            // Open queue modal
            await page.getByTestId('view-queue-button').click();

            // Should see SPRINTJAM-001 as current ticket
            await expect(page.locator('text=SPRINTJAM-001')).toBeVisible();
            await expect(page.locator('text=In Progress')).toBeVisible();
        } finally {
            await cleanup();
        }
    });

    test('should reset votes when clicking Next Ticket', async ({ browser }) => {
        const setup = await createRoomWithParticipant(browser);
        const { moderatorRoom, cleanup } = setup;

        try {
            // Cast a vote
            await moderatorRoom.castVote('5');

            // Verify vote is shown
            await moderatorRoom.expectVotePendingState();

            // Click Next Ticket
            const page = moderatorRoom.getPage();
            await page.getByTestId('next-ticket-button').click();

            // Wait for reset
            await page.waitForTimeout(500);

            // Votes should be cleared
            await moderatorRoom.expectVotesHiddenMessage('No votes yet');
        } finally {
            await cleanup();
        }
    });

    test('should increment ticket IDs sequentially', async ({ browser }) => {
        const setup = await createRoomWithParticipant(browser);
        const { moderatorRoom, cleanup } = setup;

        try {
            const page = moderatorRoom.getPage();

            // Create first ticket
            await page.getByTestId('next-ticket-button').click();
            await page.waitForTimeout(300);

            // Create second ticket
            await page.getByTestId('next-ticket-button').click();
            await page.waitForTimeout(300);

            // Open queue modal
            await page.getByTestId('view-queue-button').click();

            // Wait for modal
            const modal = page.getByRole('dialog');
            await expect(modal).toBeVisible();

            // SPRINTJAM-002 should be the current ticket
            await expect(modal.locator('text=SPRINTJAM-002')).toBeVisible();
            await expect(modal.locator('text=In Progress')).toBeVisible();

            // Completed section should exist with SPRINTJAM-001
            await expect(modal.locator('text=Completed Tickets')).toBeVisible();
            await expect(modal.locator('text=SPRINTJAM-001')).toBeVisible();
        } finally {
            await cleanup();
        }
    });

    test('should not show Next Ticket button to non-moderator', async ({
        browser,
    }) => {
        const setup = await createRoomWithParticipant(browser);
        const { participantRoom, cleanup } = setup;

        try {
            const page = participantRoom.getPage();

            // Next Ticket should not be visible to non-moderator
            await expect(page.getByTestId('next-ticket-button')).toHaveCount(0);

            // But Open Queue should be visible
            await expect(page.getByTestId('view-queue-button')).toBeVisible();
        } finally {
            await cleanup();
        }
    });
});
