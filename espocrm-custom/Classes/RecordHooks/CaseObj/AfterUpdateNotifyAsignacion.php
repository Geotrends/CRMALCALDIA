<?php

namespace Espo\Custom\Classes\RecordHooks\CaseObj;

use Espo\Core\Field\LinkParent;
use Espo\Core\Record\Hook\SaveHook;
use Espo\Custom\Tools\CaseObj\CasePartyNameHelper;
use Espo\Custom\Tools\CaseObj\CaseRadicadoHelper;
use Espo\Custom\Tools\User\AlcaldiaUserProfile;
use Espo\Entities\Notification;
use Espo\Entities\User;
use Espo\ORM\Entity;
use Espo\ORM\EntityManager;

/**
 * Una vez formalizada la radicación, avisa al rol que debe realizar
 * la asignación. El aviso se genera únicamente en la primera radicación.
 */
class AfterUpdateNotifyAsignacion implements SaveHook
{
    private const EVENT_KEY = 'case.radicado.asignacion';

    public function __construct(
        private EntityManager $entityManager,
        private AlcaldiaUserProfile $profile
    ) {}

    public function process(Entity $entity): void
    {
        if (!CaseRadicadoHelper::isRadicadoCompleto($entity)
            || CaseRadicadoHelper::wasRadicadoCompleto($entity)) {
            return;
        }

        $recipientIds = array_values(array_unique(array_merge(
            $this->profile->findActiveUserIdsByRoleName(AlcaldiaUserProfile::ROLE_ASIGNADOR),
            $this->profile->findActiveUserIdsByRoleName(AlcaldiaUserProfile::ROLE_ASIGNACION),
            $this->profile->findActiveUserIdsByRoleName(AlcaldiaUserProfile::ROLE_ASIGNACION_ALT),
            $this->profile->findActiveAdminUserIds(),
        )));

        if ($recipientIds === []) {
            return;
        }

        $actorId = trim((string) $entity->get('modifiedById'));
        $actor = $actorId !== ''
            ? $this->entityManager->getEntityById(User::ENTITY_TYPE, $actorId)
            : null;
        $numero = trim((string) $entity->get('cNumeroRadicado'));
        $caseHref = '#Case/view/' . $entity->getId();
        $caseLabel = CasePartyNameHelper::getNotificationReferenceLabel($entity);
        $guard = new \Espo\Custom\Tools\CaseObj\CaseNotificationDuplicateGuard($this->entityManager);

        foreach ($recipientIds as $recipientId) {
            if ($recipientId === $actorId || $guard->existsRecent($entity, $recipientId, self::EVENT_KEY)) {
                continue;
            }

            $notification = $this->entityManager
                ->getRDBRepositoryByClass(Notification::class)
                ->getNew();

            $notification
                ->setType(Notification::TYPE_MESSAGE)
                ->setUserId($recipientId)
                ->setMessage('Caso radicado: requiere asignación')
                ->setData([
                    'entityType' => $entity->getEntityType(),
                    'entityId' => $entity->getId(),
                    'entityName' => $caseLabel,
                    'cNumeroRadicado' => $numero,
                    'numeroRadicacion' => $numero,
                    'userId' => $actor?->getId(),
                    'userName' => $actor?->getName() ?: 'Sistema',
                    'isRadicado' => true,
                    'isPendienteAsignacion' => true,
                    'eventKey' => self::EVENT_KEY,
                    'recordUrl' => $caseHref,
                ])
                ->setRelated(LinkParent::createFromEntity($entity));

            $this->entityManager->saveEntity($notification, ['skipAll' => true]);
        }
    }
}
